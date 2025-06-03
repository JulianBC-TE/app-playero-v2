export class AppError extends Error {
	message: string;
	statusCode?: number;

	constructor(message: string, statusCode: number = 400) {
		super(message);
		this.name = "AppError";
		this.message = message;
		this.statusCode = statusCode;
	}
}
