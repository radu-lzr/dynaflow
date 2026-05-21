import { FastifyRequest, FastifyReply } from 'fastify';
import { ObjectId } from 'mongodb';
import {
    GetVehiclesSchema,
    GetVehicleByIdSchema,
    CreateVehicleSchema,
    UpdateVehicleSchema,
    DeleteVehicleSchema,
} from '../schemas/vehicles.schema';
import { FromSchema } from 'json-schema-to-ts';

type GetVehiclesQuery = FromSchema<typeof GetVehiclesSchema.querystring>;
type GetVehicleByIdParams = FromSchema<typeof GetVehicleByIdSchema.params>;
type CreateVehicleBody = FromSchema<typeof CreateVehicleSchema.body>;
type UpdateVehicleParams = FromSchema<typeof UpdateVehicleSchema.params>;
type UpdateVehicleBody = FromSchema<typeof UpdateVehicleSchema.body>;
type DeleteVehicleParams = FromSchema<typeof DeleteVehicleSchema.params>;

function docToVehicle(doc: any) {
    return {
        id: doc._id.toString(),
        brand: doc.brand,
        model: doc.model,
        yearStart: doc.yearStart,
        yearEnd: doc.yearEnd ?? null,
        engineCode: doc.engineCode,
        fuelType: doc.fuelType,
        ecuType: doc.ecuType,
        stockHp: doc.stockHp,
        stockTorque: doc.stockTorque,
        specs: doc.specs ?? {},
        tags: doc.tags ?? [],
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}

export async function getVehiclesHandler(
    request: FastifyRequest<{ Querystring: GetVehiclesQuery }>,
    reply: FastifyReply
) {
    try {
        const { page = 1, limit = 20, search, brand, fuelType, ecuType, tags } = request.query;
        const offset = (page - 1) * limit;

        const filter: Record<string, unknown> = {};

        if (search) {
            filter.$or = [
                { brand: { $regex: search, $options: 'i' } },
                { model: { $regex: search, $options: 'i' } },
                { engineCode: { $regex: search, $options: 'i' } },
            ];
        }

        if (brand) filter.brand = brand;
        if (fuelType) filter.fuelType = fuelType;
        if (ecuType) filter.ecuType = ecuType;

        if (tags) {
            const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
            if (tagList.length > 0) {
                filter.tags = { $in: tagList };
            }
        }

        const collection = request.server.mongo.collection('vehicles');
        const [totalCount, docs] = await Promise.all([
            collection.countDocuments(filter),
            collection.find(filter).skip(offset).limit(limit).toArray(),
        ]);

        return reply.code(200).send({
            vehicles: docs.map(docToVehicle),
            totalCount,
            page,
            limit,
            message: 'Vehicles retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching vehicles');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getVehicleByIdHandler(
    request: FastifyRequest<{ Params: GetVehicleByIdParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const collection = request.server.mongo.collection('vehicles');
        const doc = await collection.findOne({ _id: new ObjectId(id) });

        if (!doc) {
            return reply.code(404).send({ message: 'Vehicle not found' });
        }

        return reply.code(200).send({ ...docToVehicle(doc), message: 'Vehicle retrieved successfully' });
    } catch (error) {
        request.log.error(error, 'Error fetching vehicle by id');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function createVehicleHandler(
    request: FastifyRequest<{ Body: CreateVehicleBody }>,
    reply: FastifyReply
) {
    try {
        const { brand, model, yearStart, yearEnd, engineCode, fuelType, ecuType, stockHp, stockTorque, specs, tags } =
            request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const now = new Date();
        const doc = {
            brand,
            model,
            yearStart,
            yearEnd: yearEnd ?? null,
            engineCode,
            fuelType,
            ecuType,
            stockHp,
            stockTorque,
            specs: specs ?? {},
            tags: tags ?? [],
            createdAt: now,
            updatedAt: now,
        };

        const collection = request.server.mongo.collection('vehicles');
        const result = await collection.insertOne(doc);
        const id = result.insertedId.toString();

        request.server.audit.log({
            action: 'vehicle:create',
            resource: 'vehicle',
            resourceId: id,
            userId: actorUserId,
        });

        return reply.code(201).send({ id, message: 'Vehicle created successfully' });
    } catch (error) {
        request.log.error(error, 'Error creating vehicle');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function updateVehicleHandler(
    request: FastifyRequest<{ Params: UpdateVehicleParams; Body: UpdateVehicleBody }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const body = request.body;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const $set: Record<string, unknown> = { updatedAt: new Date() };

        if (body.brand !== undefined) $set.brand = body.brand;
        if (body.model !== undefined) $set.model = body.model;
        if (body.yearStart !== undefined) $set.yearStart = body.yearStart;
        if (body.yearEnd !== undefined) $set.yearEnd = body.yearEnd;
        if (body.engineCode !== undefined) $set.engineCode = body.engineCode;
        if (body.fuelType !== undefined) $set.fuelType = body.fuelType;
        if (body.ecuType !== undefined) $set.ecuType = body.ecuType;
        if (body.stockHp !== undefined) $set.stockHp = body.stockHp;
        if (body.stockTorque !== undefined) $set.stockTorque = body.stockTorque;
        if (body.specs !== undefined) $set.specs = body.specs;
        if (body.tags !== undefined) $set.tags = body.tags;

        const collection = request.server.mongo.collection('vehicles');
        const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set });

        if (result.matchedCount === 0) {
            return reply.code(404).send({ message: 'Vehicle not found' });
        }

        request.server.audit.log({
            action: 'vehicle:update',
            resource: 'vehicle',
            resourceId: id,
            userId: actorUserId,
        });

        return reply.code(200).send({ id, message: 'Vehicle updated successfully' });
    } catch (error) {
        request.log.error(error, 'Error updating vehicle');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function deleteVehicleHandler(
    request: FastifyRequest<{ Params: DeleteVehicleParams }>,
    reply: FastifyReply
) {
    try {
        const { id } = request.params;
        const actorUserId = request.headers['x-user-id'] as string | undefined;

        const collection = request.server.mongo.collection('vehicles');
        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return reply.code(404).send({ message: 'Vehicle not found' });
        }

        request.server.audit.log({
            action: 'vehicle:delete',
            resource: 'vehicle',
            resourceId: id,
            userId: actorUserId,
        });

        return reply.code(200).send({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        request.log.error(error, 'Error deleting vehicle');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}

export async function getTagsHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    try {
        const collection = request.server.mongo.collection('vehicles');
        const tags = await collection.distinct('tags');

        return reply.code(200).send({
            tags: tags.sort(),
            message: 'Tags retrieved successfully',
        });
    } catch (error) {
        request.log.error(error, 'Error fetching tags');
        return reply.code(500).send({ message: 'Internal Server Error' });
    }
}
