
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function checkOrphanedBookings() {
    const client = new MongoClient(process.env.MONGODB_URI || '');
    try {
        await client.connect();
        const db = client.db();

        const bookings = await db.collection('bookings').find({}).toArray();
        console.log(`Checking ${bookings.length} bookings...`);

        for (const booking of bookings) {
            let scheduleId = booking.scheduleId;
            let scheduleQuery: any = { _id: scheduleId };
            if (typeof scheduleId === 'string' && ObjectId.isValid(scheduleId)) {
                scheduleQuery = { _id: new ObjectId(scheduleId) };
            }

            const schedule = await db.collection('schedules').findOne(scheduleQuery);
            if (!schedule) {
                console.log(`Orphaned booking found! ID: ${booking._id}, scheduleId: ${booking.scheduleId}`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkOrphanedBookings();
