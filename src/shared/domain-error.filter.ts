import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  AmbiguousError,
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from './errors';

const STATUS: [new (...args: never[]) => DomainError, number][] = [
  [ValidationError, 400],
  [NotFoundError, 404],
  [ConflictError, 409],
  [AmbiguousError, 409],
];

@Catch()
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const path = ctx.getRequest<Request>().url;

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const match = STATUS.find(([type]) => exception instanceof type);
    if (match && exception instanceof DomainError) {
      response.status(match[1]).json({
        statusCode: match[1],
        error: exception.name,
        message: exception.message,
        path,
        ...(exception instanceof AmbiguousError
          ? { candidates: exception.candidates }
          : {}),
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    response
      .status(500)
      .json({ statusCode: 500, message: 'Internal server error', path });
  }
}
