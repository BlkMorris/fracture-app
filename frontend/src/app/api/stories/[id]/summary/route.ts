import { NextResponse } from 'next/server';
import { backendFetch, BackendError, isEnglishCluster, transformStoryDetail } from '../../../_lib/backend';
import { normalizeSummary, truncatePlainText } from '@/lib/text-normalization';
import type { StoryDetail } from '@/types';

const OPENAI_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    try {
        const raw = await backendFetch(`/narrative/cluster/${id}`);
        const story = transformStoryDetail(raw);

        if (!isEnglishCluster(story.cluster) || story.articles.length === 0) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const generatedAt = new Date().toISOString();
        const openAiSummary = await generateOpenAiSummary(story).catch(() => null);

        if (openAiSummary) {
            return NextResponse.json({
                summary: openAiSummary,
                provider: 'openai',
                generatedAt,
                model: OPENAI_MODEL,
            });
        }

        return NextResponse.json({
            summary: generateExtractiveSummary(story),
            provider: 'extractive',
            generatedAt,
            model: 'local-extractive',
        });
    } catch (err) {
        if (err instanceof BackendError) {
            if (err.status === 404) return NextResponse.json({ error: 'Not found' }, { status: 404 });
            return NextResponse.json({ error: err.message }, { status: 502 });
        }
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

async function generateOpenAiSummary(story: StoryDetail) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            input: [
                {
                    role: 'system',
                    content:
                        'You write concise, plain-English news summaries for Fracture. Use only the supplied article data. Do not add claims, numbers, or facts not present in the data. Return 2 sentences, 55-75 words total.',
                },
                {
                    role: 'user',
                    content: buildSummaryPrompt(story),
                },
            ],
            temperature: 0.2,
            max_output_tokens: 180,
        }),
    });

    if (!response.ok) return null;

    const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const text = data.output_text ?? data.output?.flatMap((item) => item.content ?? []).map((item) => item.text).filter(Boolean).join(' ');
    const summary = normalizeSummary(text);
    return summary ? truncatePlainText(summary, 520, { sentence: true }) : null;
}

function buildSummaryPrompt(story: StoryDetail) {
    const articles = story.articles.slice(0, 8).map((article, index) => {
        return `${index + 1}. ${article.source?.name || 'Source'}: ${article.title}${article.summary ? ` - ${article.summary}` : ''}`;
    }).join('\n');

    return [
        `Story topic: ${story.cluster.topic}`,
        story.cluster.summary ? `Existing cluster summary: ${story.cluster.summary}` : '',
        `Sources tracked: ${story.cluster.sourceCount || story.articles.length}`,
        'Articles:',
        articles,
    ].filter(Boolean).join('\n');
}

function generateExtractiveSummary(story: StoryDetail) {
    const sourceCount = story.cluster.sourceCount || story.articles.length;
    const sourceNames = story.articles
        .map((article) => article.source?.name)
        .filter(Boolean)
        .slice(0, 4)
        .join(', ');
    const leadingSummaries = story.articles
        .map((article) => article.summary || article.title)
        .filter(Boolean)
        .map((value) => truncatePlainText(value, 140, { sentence: true }))
        .slice(0, 2);
    const base = story.cluster.summary || leadingSummaries.join(' ');
    const sourceClause = sourceNames ? ` Coverage includes reporting from ${sourceNames}.` : '';

    return truncatePlainText(
        normalizeSummary(`Fracture is comparing ${sourceCount} sources around ${story.cluster.topic}. ${base}${sourceClause}`),
        520,
        { sentence: true },
    );
}
