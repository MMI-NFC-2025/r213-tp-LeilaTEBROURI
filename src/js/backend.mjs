import PocketBase from "pocketbase";

const db = new PocketBase("https://agence.tebrouri.fr/_/");
const maisonCollection = db.collection("Maison");

const normalizeAgent = (value) => value?.toString().trim().toLowerCase() || "";
const cleanValue = (value) => value?.toString().trim() || "";

async function getAgentsCollection() {
    const possibleCollections = ["agents", "agent", "Agent", "users", "_pb_users_auth_"];

    for (const collectionName of possibleCollections) {
        try {
            const collection = db.collection(collectionName);
            await collection.getList(1, 1);
            return collection;
        } catch (error) {
            continue;
        }
    }

    return null;
}

function buildAgentDisplayName(agentRecord, fallbackId) {
    const prenom = cleanValue(agentRecord?.prenom);
    const nom = cleanValue(agentRecord?.nom);
    const fullName = `${prenom} ${nom}`.trim();

    if (fullName) return fullName;
    if (cleanValue(agentRecord?.name)) return cleanValue(agentRecord?.name);
    if (cleanValue(agentRecord?.username)) return cleanValue(agentRecord?.username);
    if (cleanValue(agentRecord?.email)) return cleanValue(agentRecord?.email);
    return fallbackId;
}

export function getAgentInfo(offre) {
    const email = normalizeAgent(offre?.agent);
    if (!email) {
        return null;
    }
    return {
        id: email,
        name: email,
    };
}

export async function getOffres() {
    try {
        let data = await db.collection('Maison').getFullList({
            sort: '-created',
        });
        return data;
    } catch (error) {
        console.log('Une erreur est survenue en lisant la liste des maisons', error);
        return [];
    }
}

export async function filterByPrix(minPrix, maxPrix) {
    try {
        const data = await db.collection('Maison').getFullList({
            sort: '-created',
            filter: `prix >= ${minPrix} && prix <= ${maxPrix}`,
        });
        return data;
    } catch (error) {
        console.log('Une erreur est survenue en filtrant les maisons par prix', error);
        return [];
    }
}

export async function getImageUrl(record, recordImage) {
    return db.files.getURL(record, recordImage);
}

//backend.js
export async function getOffre(id) {
    try {
        const data = await db.collection('Maison').getOne(id);
        return data;
    } catch (error) {
        console.log('Une erreur est survenue en lisant la maison', error);
        return null;
    }
}
try {
    const grandesMaisons = await db.collection("Maison").getFullList({ filter: 'surface > 80' });
    console.log(JSON.stringify(grandesMaisons, null, 2));
} catch (e) {
    console.error(e);
}

export async function addOffre(house) {
    try {
        await db.collection('Maison').create(house);
        return {
            success: true,
            message: 'Offre ajoutée avec succès'
        };
    } catch (error) {
        console.log('Une erreur est survenue en ajoutant la maison', error);
        return {
            success: false,
            message: 'Une erreur est survenue en ajoutant la maison'
        };
    }
}

export async function setFavori(house) {
    await maisonCollection.update(house.id, { favori: !house.favori });
}

export async function getAgents() {
    const offres = await getOffres();
    const agentIds = Array.from(new Set(
        offres
            .map((offre) => normalizeAgent(offre?.agent))
            .filter(Boolean),
    ));

    const agentsCollection = await getAgentsCollection();

    if (!agentsCollection) {
        return agentIds.map((agentId) => ({ id: agentId, name: agentId }));
    }

    const resolved = await Promise.all(
        agentIds.map(async (agentId) => {
            try {
                const record = await agentsCollection.getOne(agentId);
                return {
                    id: agentId,
                    name: buildAgentDisplayName(record, agentId),
                };
            } catch (error) {
                return {
                    id: agentId,
                    name: agentId,
                };
            }
        }),
    );

    return resolved;
}

export async function getOffresByAgent(agentId) {
    const offres = await getOffres();
    return offres.filter((offre) => offre.agent === agentId);
}