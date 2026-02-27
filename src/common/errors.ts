export class IndexerError extends Error {
  constructor(message: string) {
    super(message); // Call the parent Error constructor with the error message
    this.name = 'IndexerError'; // Explicitly set the name for better stack traces

    // Optional: for correct 'instanceof' behavior with transpilers targeting pre-ES6 (V8 engines)
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, IndexerError.prototype);
    } else {
      (this as any).__proto__ = IndexerError.prototype;
    }
  }
}

export class FatalIndexerError extends IndexerError {
  constructor(message: string) {
    super(message); // Call the parent Error constructor with the error message and original error
    this.name = 'FatalIndexerError'; // Explicitly set the name for better stack traces

    // Optional: for correct 'instanceof' behavior with transpilers targeting pre-ES6 (V8 engines)
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, FatalIndexerError.prototype);
    } else {
      (this as any).__proto__ = FatalIndexerError.prototype;
    }
  }
}