import Logger from 'src/logger'
import promiseTimeout from 'src/utils/promiseTimeout'
import { Notifier } from 'src/notifier'
import { rateLimitMaxRetries, rpcTimeoutSeconds } from 'src/config'
import { wait } from 'src/utils'

const logger = new Logger('rateLimitRetry')
const notifier = new Notifier('rateLimitRetry')

export default function rateLimitRetry (
  target: Object,
  propertyKey: string,
  descriptor: PropertyDescriptor
): any {
  const originalMethod = descriptor.value
  descriptor.value = async function (...args: any[]) {
    return rateLimitRetryFn(originalMethod.bind(this))(...args)
  }

  return descriptor
}

export function rateLimitRetryFn (fn: any): any {
  return async (...args: any[]) => {
    let retries = 0
    const retry = () => promiseTimeout(fn(...args), rpcTimeoutSeconds * 1000)
    while (true) {
      try {
        // the await here is intentional so it's caught in the try/catch below.
        const result = await retry()
        return result
      } catch (err) {
        const errorRegex = /(timeout|timedout|bad response|response error|rate limit|too many concurrent requests)/gi
        const isRateLimitError = errorRegex.test(err.message)
        // throw error as usual if it's not a rate limit error
        if (!isRateLimitError) {
          logger.error(err.message)
          throw err
        }
        retries++
        // if it's a rate limit error, then throw error after max retries attempted.
        if (retries >= rateLimitMaxRetries) {
          notifier.error(`rateLimitRetry function error: ${err.message}`)
          throw err
        }

        const delayMs = (1 << retries) * 1000
        logger.warn(
          `retry attempt #${retries} failed with error "${
            err.message
          }". retrying again in ${delayMs / 1000} seconds`
        )
        // exponential backoff wait
        await wait(delayMs)
      }
    }
  }
}
