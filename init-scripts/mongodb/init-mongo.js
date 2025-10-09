// MongoDB Initialization Script for BANTADS Authentication Service
// This script creates the bantads_auth database and initializes it with pre-registered users

print("🚀 Starting MongoDB initialization for BANTADS...");

// Switch to the authentication database
db = db.getSiblingDB("bantads_auth");

print("📊 Database: " + db.getName());

// Create users collection if it doesn't exist
db.createCollection("users");

print("👥 Collection: users");

// Pre-registered users data as per specification
const users = [
    // Clients
    {
        cpf: "12912861012",
        nome: "Catharyna",
        email: "cli1@bantads.com.br",
        senha: "$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG", // 'tads' hashed with bcrypt
        tipo: "CLIENTE",
        ativo: true,
        createdAt: new Date("2000-01-01"),
        updatedAt: new Date("2000-01-01"),
    },
    {
        cpf: "09506382000",
        nome: "Cleuddônio",
        email: "cli2@bantads.com.br",
        senha: "$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG", // 'tads' hashed with bcrypt
        tipo: "CLIENTE",
        ativo: true,
        createdAt: new Date("1990-10-10"),
        updatedAt: new Date("1990-10-10"),
    },
    {
        cpf: "85733854057",
        nome: "Catianna",
        email: "cli3@bantads.com.br",
        senha: "$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG", // 'tads' hashed with bcrypt
        tipo: "CLIENTE",
        ativo: true,
        createdAt: new Date("2012-12-12"),
        updatedAt: new Date("2012-12-12"),
    },
    {
        cpf: "58872160006",
        nome: "Cutardo",
        email: "cli4@bantads.com.br",
        senha: "$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG", // 'tads' hashed with bcrypt
        tipo: "CLIENTE",
        ativo: true,
        createdAt: new Date("2022-02-22"),
        updatedAt: new Date("2022-02-22"),
    },
    {
        cpf: "76179646090",
        nome: "Coândrya",
        email: "cli5@bantads.com.br",
        senha: "$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG", // 'tads' hashed with bcrypt
        tipo: "CLIENTE",
        ativo: true,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
    },
    // Managers
    {
        cpf: "98574307084",
        nome: "Geniéve",
        email: "ger1@bantads.com.br",
        senha: "$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG", // 'tads' hashed with bcrypt
        tipo: "GERENTE",
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        cpf: "64065268052",
        nome: "Godophredo",
        email: "ger2@bantads.com.br",
        senha: "$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG", // 'tads' hashed with bcrypt
        tipo: "GERENTE",
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        cpf: "23862179060",
        nome: "Gyândula",
        email: "ger3@bantads.com.br",
        senha: "$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG", // 'tads' hashed with bcrypt
        tipo: "GERENTE",
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    // Administrator
    {
        cpf: "40501740066",
        nome: "Adamântio",
        email: "adm1@bantads.com.br",
        senha: "$2a$10$U0qjOCPVy/Sj3A3W9DCCkO7YSWDyPUYoHyRHkfRBpd0sXTvbEOgSG", // 'tads' hashed with bcrypt
        tipo: "ADMINISTRADOR",
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

// Check if users already exist
const existingUsersCount = db.users.countDocuments({});

if (existingUsersCount === 0) {
    print("📝 Inserting " + users.length + " pre-registered users...");

    // Insert all users
    db.users.insertMany(users);

    print("✅ Successfully inserted all users!");
} else {
    print("⚠️  Users already exist. Skipping insertion.");
}

// Create indexes for better query performance
print("🔍 Creating indexes...");

// Unique index on email for login
db.users.createIndex({ email: 1 }, { unique: true });

// Index on CPF for queries
db.users.createIndex({ cpf: 1 }, { unique: true });

// Index on tipo for filtering by user type
db.users.createIndex({ tipo: 1 });

// Index on ativo for filtering active users
db.users.createIndex({ ativo: 1 });

print("✅ Indexes created successfully!");

// Display summary
print("📊 Summary:");
print("   Total users in database: " + db.users.countDocuments({}));
print("   Clients: " + db.users.countDocuments({ tipo: "CLIENTE" }));
print("   Managers: " + db.users.countDocuments({ tipo: "GERENTE" }));
print("   Administrators: " + db.users.countDocuments({ tipo: "ADMINISTRADOR" }));

print("✅ MongoDB initialization completed!");
