import { db, collection, addDoc, query, where, getDocs, Timestamp } from './firebase.js';

// Function to check if spot is available
async function isSpotAvailable(obj_code) {
    try {
        //set timestamp as now and get all the reservationc ollection
        const now = Timestamp.now();
        const reservationsRef = collection(db, 'reservations');
        
        const q = query(
            //check reservations that have the same object code
            reservationsRef,
            where('obj_code', '==', obj_code)
        );
        //and get the documents of reports where the obj_codes of spots match
        const querySnapshot = await getDocs(q);
        
        // Check if any reservation is current
        const hasCurrentReservation = querySnapshot.docs.some(doc => {
            const data = doc.data();
            //if the end time of reservation later than current time
            return data.end_time.toMillis() > now.toMillis();
        });
        //if all conditions are false, then it has a reservation
        return !hasCurrentReservation;
        
    } catch (error) {
        console.error("Error checking availability:", error);
        throw error;
    }
}

// Function to reserve a spot
async function reserveSpot(obj_code, timelimit) {
    try {
        const start_time = Timestamp.now();
        const end_time = new Timestamp(
            start_time.seconds + (timelimit * 60),
            start_time.nanoseconds
        );

        await addDoc(collection(db, 'reservations'), {
            obj_code,
            start_time,
            end_time,
            timelimit
        });
        return true;
    } catch (error) {
        console.error("Error reserving spot:", error);
        return false;
    }
}

export { isSpotAvailable, reserveSpot };