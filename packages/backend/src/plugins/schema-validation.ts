import type { FastifyInstance, FastifyRequest } from 'fastify';

import { Effect, Schema as S } from 'effect';
import fp from 'fastify-plugin';

// Schema validation errors
export class SchemaValidationError extends Error {
  constructor(
    public readonly field: 'body' | 'params' | 'querystring' | 'headers',
    public readonly details: Array<{ path: string; message: string }>
  ) {
    super(`Schema validation failed for ${field}`);
    this.name = 'SchemaValidationError';
  }
}

// Plugin options interface
interface SchemaValidationOptions {
  includeErrorDetails?: boolean;
}

// Type-safe validation function using Effect-TS
export const validateWithSchema = <T>(
  schema: S.Schema<T>,
  data: unknown,
  field: 'body' | 'params' | 'querystring' | 'headers'
): Effect.Effect<T, SchemaValidationError> => {
  return S.decodeUnknown(schema)(data).pipe(
    Effect.mapError((parseError) => {
      // Create simple error details from parseError
      const details = [
        {
          path: field,
          message: parseError.message || 'Schema validation failed',
        },
      ];

      return new SchemaValidationError(field, details);
    })
  );
};

// Type-safe schema validation configuration
// Use `any` because we don't care the exact shape of the data
export interface SchemaValidationConfig {
  // oxlint-disable-next-line no-explicit-any
  body?: S.Schema<any>;
  // oxlint-disable-next-line no-explicit-any
  params?: S.Schema<any>;
  // oxlint-disable-next-line no-explicit-any
  querystring?: S.Schema<any>;
  // oxlint-disable-next-line no-explicit-any
  headers?: S.Schema<any>;
}

const VALIDATION_FIELDS = [
  { configKey: 'body', requestData: 'body', resultKey: 'validatedBody' },
  { configKey: 'params', requestData: 'params', resultKey: 'validatedParams' },
  {
    configKey: 'querystring',
    requestData: 'query',
    resultKey: 'validatedQuery',
  },
  {
    configKey: 'headers',
    requestData: 'headers',
    resultKey: 'validatedHeaders',
  },
] as const;

export const withSchemaValidation = (config: SchemaValidationConfig) => {
  return async (request: FastifyRequest): Promise<void> => {
    const validateAllFields = Effect.gen(function* () {
      for (const { configKey, requestData, resultKey } of VALIDATION_FIELDS) {
        const schema = config[configKey];
        if (schema) {
          const validated = yield* validateWithSchema(
            schema,
            request[requestData],
            configKey
          );
          (request as unknown as Record<string, unknown>)[resultKey] =
            validated;
        }
      }
    });

    // Run the validation Effect - let SchemaValidationError throw
    // so the global error handler can catch it and stop request processing
    await Effect.runPromise(
      validateAllFields.pipe(
        Effect.catchAll((validationError: SchemaValidationError) =>
          Effect.sync(() => {
            throw validationError;
          })
        )
      )
    );
  };
};

const schemaValidationPluginImpl = async (
  fastify: FastifyInstance,
  options: SchemaValidationOptions = {}
) => {
  const { includeErrorDetails = true } = options;

  // Add utility methods to fastify instance
  fastify.decorate('validateWithSchema', validateWithSchema);
  fastify.decorate('withSchemaValidation', withSchemaValidation);

  // Global error handler for schema validation errors
  fastify.setErrorHandler(async (error, _request, reply) => {
    if (error instanceof SchemaValidationError) {
      const errorResponse = {
        success: false,
        error: 'Validation Error',
        field: error.field,
        message: `Invalid ${error.field} data`,
        ...(includeErrorDetails && { details: error.details }),
      };

      return reply.code(400).send(errorResponse);
    }

    // Pass through other errors
    throw error;
  });
};

// Enhanced FastifyRequest with typed validation results
export interface TypedFastifyRequest<
  TBody = unknown,
  TParams = unknown,
  TQuery = unknown,
  THeaders = unknown,
> extends FastifyRequest {
  validatedBody?: TBody;
  validatedParams?: TParams;
  validatedQuery?: TQuery;
  validatedHeaders?: THeaders;
}

// Extend Fastify instance with schema validation methods
declare module 'fastify' {
  interface FastifyInstance {
    validateWithSchema: typeof validateWithSchema;
    withSchemaValidation: typeof withSchemaValidation;
  }
}

export const schemaValidationPlugin = fp(schemaValidationPluginImpl, {
  name: 'schema-validation',
  fastify: '5.x',
});
