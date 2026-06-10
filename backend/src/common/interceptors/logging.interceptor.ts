import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

/**
 * Logs every incoming request and its duration.
 * Attached globally in main.ts.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url } = request;
    const now = Date.now();
    const userAgent = request.get('user-agent') || '-';

    return next.handle().pipe(
      tap(() => {
        const response = ctx.getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - now;

        this.logger.log(
          `${method} ${url} ${statusCode} ${duration}ms — ${userAgent}`,
        );
      }),
    );
  }
}
