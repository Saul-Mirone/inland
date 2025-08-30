import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { Effect, Schema as S } from 'effect'
import fp from 'fastify-plugin'

// Schema validation errors
export class SchemaValidationError extends Error {
  constructor(
    public readonly field: 'body' | 'params' | 'querystring' | 'headers',
    public readonly details: Array<{ path: string; message: string }>
  ) {
    super(`Schema validation failed for ${field}`)
    this.name = 'SchemaValidationError'
  }
}

// Plugin options interface
interface SchemaValidationOptions {
  includeErrorDetails?: boolean
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
      ]

      return new SchemaValidationError(field, details)
    })
  )
}

// Type-safe schema validation configuration
// Use `any` because we don't care the exact shape of the data
export interface SchemaValidationConfig {
  // oxlint-disable-next-line no-explicit-any
  body?: S.Schema<any>
  // oxlint-disable-next-line no-explicit-any
  params?: S.Schema<any>
  // oxlint-disable-next-line no-explicit-any
  querystring?: S.Schema<any>
  // oxlint-disable-next-line no-explicit-any
  headers?: S.Schema<any>
}

// Pre-handler factory for route-level validation using Effect-TS with type inference
export const withSchemaValidation = (config: SchemaValidationConfig) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const validateAllFields = Effect.gen(function* () {
      // Validate body
      if (config.body) {
        const validatedBody = yield* validateWithSchema(
          config.body,
          request.body,
          'body'
        )
        ;(
          request as FastifyRequest & { validatedBody: unknown }
        ).validatedBody = validatedBody
      }

      // Validate params
      if (config.params) {
        const validatedParams = yield* validateWithSchema(
          config.params,
          request.params,
          'params'
        )
        ;(
          request as FastifyRequest & { validatedParams: unknown }
        ).validatedParams = validatedParams
      }

      // Validate querystring
      if (config.querystring) {
        const validatedQuery = yield* validateWithSchema(
          config.querystring,
          request.query,
          'querystring'
        )
        ;(
          request as FastifyRequest & { validatedQuery: unknown }
        ).validatedQuery = validatedQuery
      }

      // Validate headers
      if (config.headers) {
        const validatedHeaders = yield* validateWithSchema(
          config.headers,
          request.headers,
          'headers'
        )
        ;(
          request as FastifyRequest & { validatedHeaders: unknown }
        ).validatedHeaders = validatedHeaders
      }
    })

    // Run the validation Effect and handle errors
    await Effect.runPromise(
      validateAllFields.pipe(
        Effect.catchAll((validationError: SchemaValidationError) =>
          Effect.sync(() => {
            const errorResponse = {
              success: false,
              error: 'Validation Error',
              field: validationError.field,
              message: `Invalid ${validationError.field} data`,
              details: validationError.details,
            }

            return reply.code(400).send(errorResponse)
          })
        )
      )
    )
  }
}

const schemaValidationPluginImpl = async (
  fastify: FastifyInstance,
  options: SchemaValidationOptions = {}
) => {
  const { includeErrorDetails = true } = options

  // Add utility methods to fastify instance
  fastify.decorate('validateWithSchema', validateWithSchema)
  fastify.decorate('withSchemaValidation', withSchemaValidation)

  // Global error handler for schema validation errors
  fastify.setErrorHandler(async (error, _request, reply) => {
    if (error instanceof SchemaValidationError) {
      const errorResponse = {
        success: false,
        error: 'Validation Error',
        field: error.field,
        message: `Invalid ${error.field} data`,
        ...(includeErrorDetails && { details: error.details }),
      }

      return reply.code(400).send(errorResponse)
    }

    // Pass through other errors
    throw error
  })
}

// Enhanced FastifyRequest with typed validation results
export interface TypedFastifyRequest<
  TBody = unknown,
  TParams = unknown,
  TQuery = unknown,
  THeaders = unknown,
> extends FastifyRequest {
  validatedBody?: TBody
  validatedParams?: TParams
  validatedQuery?: TQuery
  validatedHeaders?: THeaders
}

// Extend Fastify instance with schema validation methods
declare module 'fastify' {
  interface FastifyInstance {
    validateWithSchema: typeof validateWithSchema
    withSchemaValidation: typeof withSchemaValidation
  }
}

export const schemaValidationPlugin = fp(schemaValidationPluginImpl, {
  name: 'schema-validation',
  fastify: '5.x',
})

// Convenience function for common validation patterns
export const validateAndExtract = {
  fromRequest: <T>(
    request: FastifyRequest,
    schema: S.Schema<T>,
    field: 'body' | 'params' | 'querystring'
  ): Effect.Effect<T, SchemaValidationError> => {
    const data =
      field === 'body'
        ? request.body
        : field === 'params'
          ? request.params
          : request.query

    return validateWithSchema(schema, data, field)
  },
}
