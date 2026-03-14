import { City, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  await prisma.notification.deleteMany();
  await prisma.alertAssignment.deleteMany();
  await prisma.custodyAlert.deleteMany();
  await prisma.dutyAssignment.deleteMany();
  await prisma.responseSetting.deleteMany();
  await prisma.user.deleteMany();

  const batonnier = await prisma.user.create({
    data: {
      name: "Claire Besson",
      email: "batonnier@demo.fr",
      passwordHash,
      role: Role.BATONNIER,
    },
  });

  const lawyers = await Promise.all([
    prisma.user.create({
      data: {
        name: "Maitre Lea Martin",
        email: "avocat.paris1@demo.fr",
        passwordHash,
        role: Role.AVOCAT,
        city: City.PARIS,
      },
    }),
    prisma.user.create({
      data: {
        name: "Maitre Paul Garnier",
        email: "avocat.paris2@demo.fr",
        passwordHash,
        role: Role.AVOCAT,
        city: City.PARIS,
      },
    }),
    prisma.user.create({
      data: {
        name: "Maitre Ines Morel",
        email: "avocat.bobigny1@demo.fr",
        passwordHash,
        role: Role.AVOCAT,
        city: City.BOBIGNY,
      },
    }),
    prisma.user.create({
      data: {
        name: "Maitre Hugo Roussel",
        email: "avocat.bobigny2@demo.fr",
        passwordHash,
        role: Role.AVOCAT,
        city: City.BOBIGNY,
      },
    }),
    prisma.user.create({
      data: {
        name: "Maitre Sarah Laurent",
        email: "avocat.creteil1@demo.fr",
        passwordHash,
        role: Role.AVOCAT,
        city: City.CRETEIL,
      },
    }),
    prisma.user.create({
      data: {
        name: "Maitre Mehdi Dupuis",
        email: "avocat.creteil2@demo.fr",
        passwordHash,
        role: Role.AVOCAT,
        city: City.CRETEIL,
      },
    }),
    prisma.user.create({
      data: {
        name: "Maitre Chloe Caron",
        email: "avocat.nanterre1@demo.fr",
        passwordHash,
        role: Role.AVOCAT,
        city: City.NANTERRE,
      },
    }),
    prisma.user.create({
      data: {
        name: "Maitre Sami Benali",
        email: "avocat.nanterre2@demo.fr",
        passwordHash,
        role: Role.AVOCAT,
        city: City.NANTERRE,
      },
    }),
    prisma.user.create({
      data: {
        name: "Maitre Emma Faure",
        email: "avocat.attente@demo.fr",
        passwordHash,
        role: Role.AVOCAT,
      },
    }),
  ]);

  await Promise.all([
    prisma.user.create({
      data: {
        name: "Capitaine Julien Roy",
        email: "policier.paris@demo.fr",
        passwordHash,
        role: Role.POLICIER,
        city: City.PARIS,
      },
    }),
    prisma.user.create({
      data: {
        name: "Lieutenant Nora Petit",
        email: "policier.bobigny@demo.fr",
        passwordHash,
        role: Role.POLICIER,
        city: City.BOBIGNY,
      },
    }),
    prisma.user.create({
      data: {
        name: "Commandant Leo Marchal",
        email: "policier.creteil@demo.fr",
        passwordHash,
        role: Role.POLICIER,
        city: City.CRETEIL,
      },
    }),
    prisma.user.create({
      data: {
        name: "Major Amina Diallo",
        email: "policier.nanterre@demo.fr",
        passwordHash,
        role: Role.POLICIER,
        city: City.NANTERRE,
      },
    }),
  ]);

  const managedCities = [
    City.PARIS,
    City.BOBIGNY,
    City.CRETEIL,
    City.NANTERRE,
    City.VERSAILLES,
    City.EVRY_COURCOURONNES,
    City.MELUN,
    City.PONTOISE,
  ];

  await prisma.responseSetting.createMany({
    data: managedCities.map((city) => ({
      city,
      responseWindowMinutes: city === City.PARIS ? 2 : 5,
      updatedById: batonnier.id,
    })),
  });

  const [paris1, paris2, bobigny1, bobigny2, creteil1, creteil2, nanterre1, nanterre2] =
    lawyers;

  await prisma.dutyAssignment.createMany({
    data: [
      {
        city: City.PARIS,
        lawyerId: paris1.id,
        assignedById: batonnier.id,
        priority: 1,
      },
      {
        city: City.PARIS,
        lawyerId: paris2.id,
        assignedById: batonnier.id,
        priority: 2,
      },
      {
        city: City.BOBIGNY,
        lawyerId: bobigny1.id,
        assignedById: batonnier.id,
        priority: 1,
      },
      {
        city: City.BOBIGNY,
        lawyerId: bobigny2.id,
        assignedById: batonnier.id,
        priority: 2,
      },
      {
        city: City.CRETEIL,
        lawyerId: creteil1.id,
        assignedById: batonnier.id,
        priority: 1,
      },
      {
        city: City.CRETEIL,
        lawyerId: creteil2.id,
        assignedById: batonnier.id,
        priority: 2,
      },
      {
        city: City.NANTERRE,
        lawyerId: nanterre1.id,
        assignedById: batonnier.id,
        priority: 1,
      },
      {
        city: City.NANTERRE,
        lawyerId: nanterre2.id,
        assignedById: batonnier.id,
        priority: 2,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
