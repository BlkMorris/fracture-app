import {
  IsString,
  IsUrl,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { FramingType, LedeType } from '../../common/enums';

export class CreateArticleDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsUUID()
  storyClusterId?: string;

  // ── Bias scores (typically set by pipeline, but allowed on create) ──
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  politicalLeanScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  establishmentScore?: number;

  // ── Framing ─────────────────────────────────────────
  @IsOptional()
  @IsEnum(FramingType)
  framingType?: FramingType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  framingConfidence?: number;

  // ── Sentiment ───────────────────────────────────────
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  headlineSentiment?: number;

  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  bodySentiment?: number;

  // ── Structural ──────────────────────────────────────
  @IsOptional()
  @IsEnum(LedeType)
  ledeType?: LedeType;

  @IsOptional()
  @IsNumber()
  paragraphCount?: number;
}
