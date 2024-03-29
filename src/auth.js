import crypto from 'crypto'

/**
 * NOTE: This hash is used across our mail and API servers.
 * It should not be changed under any circumstances, otherwise things wong be backwards
 * compatible anymore.
 */

const SALT = 'A8xu2aeHxVduuHWJgnBuUFoWZMQ(cacr'

export function generateHash(user) {
  const userIdWithSalt = `${user._id}${SALT}`
  return crypto.createHash('sha256').update(userIdWithSalt).digest('hex')
}
