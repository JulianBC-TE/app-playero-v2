// src/backend/errors.ts
export class BadRequestException extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestException';
  }
}

export class NotFoundException extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundException';
  }
}

export class ConflictException extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictException';
  }
}

export class UnauthorizedException extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedException';
  }
}