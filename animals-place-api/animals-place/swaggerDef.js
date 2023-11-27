/**
 * @swagger
 * definition:
 *   Info:
 *     properties:
 *       title:
 *         type: string
 *       version:
 *         type: string
 *   Pet:
 *     properties:
 *       name:
 *         type: string
 *       age:
 *         type: integer
 *     required:
 *       - name
 *
 */

/**
 * @swagger
 * /pets:
 *   get:
 *     description: Get all pets
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Return all pets
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/Pet'
 */
