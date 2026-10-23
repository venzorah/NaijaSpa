import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_COMMERCIAL } from "../src/lib/commercial";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("NaijaSpa!dev", 12);

  const config: Record<string, string> = {
    spaSurchargeKobo: String(DEFAULT_COMMERCIAL.spaSurchargeKobo),
    hotelSurchargeKobo: String(DEFAULT_COMMERCIAL.hotelSurchargeKobo),
    homeSurchargeKobo: String(DEFAULT_COMMERCIAL.homeSurchargeKobo),
    surchargeRecipient: DEFAULT_COMMERCIAL.surchargeRecipient,
    freeCommissionBps: String(DEFAULT_COMMERCIAL.freeCommissionBps),
    paidCommissionBps: String(DEFAULT_COMMERCIAL.paidCommissionBps),
    graceDays: String(DEFAULT_COMMERCIAL.graceDays),
    paidPlanPricesNote: "Paid plan prices below are seed placeholders for local development. Change them in Admin → Commercial config before production."
  };
  for (const [key, value] of Object.entries(config)) {
    await prisma.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  const free = await prisma.subscriptionPlan.upsert({
    where: { code: "FREE" },
    update: { priceKobo: 0, commissionBps: 1000, publicDirectContact: false, enhancedVisibility: false, sponsoredEligible: false },
    create: {
      code: "FREE",
      name: "Free",
      durationDays: 36500,
      priceKobo: 0,
      commissionBps: 1000,
      publicDirectContact: false,
      enhancedVisibility: false,
      sponsoredEligible: false,
      unlimitedListings: true
    }
  });
  const weekly = await prisma.subscriptionPlan.upsert({
    where: { code: "WEEKLY" },
    update: {},
    create: {
      code: "WEEKLY",
      name: "Weekly",
      durationDays: 7,
      priceKobo: 0,
      commissionBps: 0,
      publicDirectContact: true,
      enhancedVisibility: true,
      sponsoredEligible: true,
      unlimitedListings: true
    }
  });
  const monthly = await prisma.subscriptionPlan.upsert({
    where: { code: "MONTHLY" },
    update: {},
    create: {
      code: "MONTHLY",
      name: "Monthly",
      durationDays: 30,
      priceKobo: 0,
      commissionBps: 0,
      publicDirectContact: true,
      enhancedVisibility: true,
      sponsoredEligible: true,
      unlimitedListings: true
    }
  });
  const six = await prisma.subscriptionPlan.upsert({
    where: { code: "SIX_MONTH" },
    update: {},
    create: {
      code: "SIX_MONTH",
      name: "Six month",
      durationDays: 182,
      priceKobo: 0,
      commissionBps: 0,
      publicDirectContact: true,
      enhancedVisibility: true,
      sponsoredEligible: true,
      unlimitedListings: true
    }
  });
  void weekly;
  void monthly;
  void six;

  const roles = [
    ["super.admin@naijaspa.ng", "Amaka Obi", "super_admin"],
    ["ops@naijaspa.ng", "Chinedu Bassey", "operations_admin"],
    ["verify@naijaspa.ng", "Zainab Lawal", "verification_officer"],
    ["support@naijaspa.ng", "Tola Adeyemi", "support_agent"],
    ["finance@naijaspa.ng", "Ifeanyi Okonkwo", "finance_officer"],
    ["content@naijaspa.ng", "Ngozi Eze", "content_manager"],
    ["marketing@naijaspa.ng", "Halima Bello", "marketing_manager"],
    ["moderator@naijaspa.ng", "Kunle Salami", "moderator"],
    ["analyst@naijaspa.ng", "Ruth Danjuma", "analyst"],
    ["customer@naijaspa.ng", "Adaeze Nwosu", "customer"]
  ] as const;

  const users: Record<string, string> = {};
  for (const [email, name, role] of roles) {
    const u = await prisma.user.upsert({
      where: { email },
      update: { role, status: "active" },
      create: { email, name, role, passwordHash, status: "active", emailVerifiedAt: new Date(), locale: "en", theme: "dark" }
    });
    users[role] = u.id;
  }

  await prisma.customerProfile.upsert({
    where: { userId: users.customer },
    update: {},
    create: { userId: users.customer, city: "Lagos", neighbourhood: "Lekki" }
  });

  async function makeVendor(opts: {
    email: string;
    name: string;
    business: string;
    slug: string;
    city: string;
    area: string;
    paid: boolean;
    phone: string;
  }) {
    const owner = await prisma.user.upsert({
      where: { email: opts.email },
      update: {},
      create: {
        email: opts.email,
        name: opts.name,
        role: "vendor_owner",
        passwordHash,
        status: "active",
        emailVerifiedAt: new Date()
      }
    });
    const vendor = await prisma.vendor.upsert({
      where: { slug: opts.slug },
      update: { coverUrl: "/photos/band-spa.jpg" },
      create: {
        ownerId: owner.id,
        slug: opts.slug,
        businessName: opts.business,
        description: `${opts.business} offers professional spa and wellness treatments in ${opts.area}, ${opts.city}.`,
        city: opts.city,
        neighbourhood: opts.area,
        address: `12 Wellness Close, ${opts.area}, ${opts.city}`,
        coverageJson: JSON.stringify([opts.city, opts.area]),
        amenitiesJson: JSON.stringify(["Steam room", "Showers", "Private suites"]),
        hoursJson: JSON.stringify({ mon: "09:00-20:00", tue: "09:00-20:00", wed: "09:00-20:00", thu: "09:00-20:00", fri: "09:00-21:00", sat: "10:00-21:00", sun: "11:00-18:00" }),
        privatePhone: opts.phone,
        privateWhatsapp: opts.phone,
        cancellationPolicy: "Free cancellation up to 24 hours before the appointment.",
        applicationStatus: "approved",
        verificationStatus: "verified",
        visibility: "public",
        ratingAvg: opts.paid ? 4.9 : 4.6,
        reviewCount: opts.paid ? 128 : 41,
        logoUrl: "/brand/icon-white.png",
        coverUrl: "/photos/band-spa.jpg"
      }
    });
    const plan = opts.paid ? await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "MONTHLY" } }) : free;
    await prisma.vendorSubscription.create({
      data: {
        vendorId: vendor.id,
        planId: plan.id,
        status: "active",
        source: opts.paid ? "admin_grant" : "default",
        startsAt: new Date(),
        endsAt: opts.paid ? new Date(Date.now() + 30 * 864e5) : new Date("9999-12-31")
      }
    });
    const staff = await prisma.vendorStaff.create({
      data: { vendorId: vendor.id, name: `${opts.name.split(" ")[0]} Therapist`, title: "Lead therapist" }
    });
    for (let d = 0; d < 7; d++) {
      await prisma.availabilitySlot.create({
        data: { vendorId: vendor.id, staffId: staff.id, weekday: d, startMin: 9 * 60, endMin: 20 * 60, bufferMin: 15 }
      });
    }
    return { vendor, staff };
  }

  const cats = [
    ["massage", "Massage therapy", "swedish,deep tissue,relaxation"],
    ["spa", "Spa treatments", "sauna,steam,ritual"],
    ["facials", "Facials and skincare", "facial,glow,skin"],
    ["body", "Body treatments", "scrub,wrap,polish"],
    ["couples", "Couples treatments", "duo,partners"],
    ["packages", "Wellness packages", "day spa,package"],
    ["beauty", "Beauty and relaxation", "nails,beauty"]
  ] as const;
  const catIds: Record<string, string> = {};
  let i = 0;
  for (const [slug, name, synonyms] of cats) {
    const c = await prisma.category.upsert({
      where: { slug },
      update: { imageUrl: `/photos/${slug === "facials" ? "facials" : slug}.jpg` },
      create: { slug, name, synonyms, sortOrder: i++, imageUrl: `/photos/${slug === "facials" ? "facials" : slug}.jpg`, active: true }
    });
    catIds[slug] = c.id;
  }

  const paidV = await makeVendor({
    email: "paid.vendor@naijaspa.ng",
    name: "Kemi Osun",
    business: "Osun Wellness Spa",
    slug: "osun-wellness",
    city: "Lagos",
    area: "Lekki",
    paid: true,
    phone: "+2348011111111"
  });
  const freeV = await makeVendor({
    email: "free.vendor@naijaspa.ng",
    name: "Ibrahim Musa",
    business: "Calm House Ikeja",
    slug: "calm-house-ikeja",
    city: "Lagos",
    area: "Ikeja",
    paid: false,
    phone: "+2348022222222"
  });

  const services = [
    {
      vendor: paidV,
      slug: "lekki-swedish-90",
      name: "Swedish massage 90 min",
      cat: "massage",
      price: 3500000,
      duration: 90,
      img: "/photos/massage.jpg"
    },
    {
      vendor: paidV,
      slug: "couples-ritual",
      name: "Couples ritual",
      cat: "couples",
      price: 7200000,
      duration: 120,
      img: "/photos/couples.jpg"
    },
    {
      vendor: freeV,
      slug: "ikeja-facial-60",
      name: "Glow facial 60 min",
      cat: "facials",
      price: 1800000,
      duration: 60,
      img: "/photos/facials.jpg"
    },
    {
      vendor: freeV,
      slug: "home-deep-tissue",
      name: "Deep tissue (home or hotel)",
      cat: "massage",
      price: 2500000,
      duration: 75,
      img: "/photos/massage.jpg"
    }
  ];

  for (const s of services) {
    const row = await prisma.service.upsert({
      where: { slug: s.slug },
      update: { hotelAddonKobo: 1500000, homeAddonKobo: 1000000, imageUrl: s.img },
      create: {
        vendorId: s.vendor.vendor.id,
        categoryId: catIds[s.cat],
        slug: s.slug,
        name: s.name,
        description: `${s.name} performed by a verified NaijaSpa therapist.`,
        imageUrl: s.img,
        basePriceKobo: s.price,
        durationMin: s.duration,
        spaEnabled: true,
        hotelEnabled: true,
        homeEnabled: s.slug.includes("home") || s.slug.includes("swedish"),
        hotelAddonKobo: 1500000,
        homeAddonKobo: 1000000,
        staff: { create: { staffId: s.vendor.staff.id } }
      }
    });
    await prisma.serviceAddon.create({
      data: { serviceId: row.id, name: "Aromatherapy oils", priceKobo: 250000, durationMin: 0 }
    });
  }

  await prisma.membershipPlan.upsert({
    where: { code: "CALM_MONTHLY" },
    update: {},
    create: {
      code: "CALM_MONTHLY",
      name: "Calm monthly",
      interval: "monthly",
      priceKobo: 1500000,
      benefits: JSON.stringify(["5% off eligible bookings", "Priority support"])
    }
  });
  await prisma.promotion.upsert({
    where: { code: "DUO15" },
    update: {},
    create: {
      code: "DUO15",
      description: "15% off couples bookings",
      percentOff: 15,
      startsAt: new Date(),
      endsAt: new Date("2026-11-30"),
      active: true
    }
  });

  const faqs = [
    ["How do bookings work?", "Choose a service, pick Spa/Office, Hotel or Home, select a time, then pay. The booking is only confirmed after payment is verified by NaijaSpa."],
    ["Why can’t I see a vendor’s WhatsApp?", "Public phone and WhatsApp are available only for vendors on an active paid plan, and only when the number is valid."],
    ["What is the hotel or home service add-on?", "Spa/Office has no extra charge. Vendors set their own Hotel service and Home service add-on prices. The selected add-on is added to the treatment total."],
    ["Do you offer Darkroom?", "No. NaijaSpa is a professional spa and wellness marketplace only."]
  ];
  for (const [q, a] of faqs) {
    await prisma.faq.create({ data: { question: q, answer: a } });
  }

  await prisma.cmsBlock.createMany({
    data: [
      { key: "about", title: "About NaijaSpa", body: "NaijaSpa is a premium spa, massage and wellness marketplace for Nigeria. We connect customers with verified providers." },
      { key: "contact", title: "Contact", body: "Maitama, Abuja · concierge@naijaspa.ng" },
      { key: "privacy", title: "Privacy", body: "We store only what we need to run bookings and accounts. You may request account deletion from settings." },
      { key: "terms", title: "Terms", body: "Bookings are confirmed only after verified payment. Historical financial snapshots are not recalculated when plans change." }
    ]
  });

  await prisma.campaign.create({
    data: {
      vendorId: paidV.vendor.id,
      placement: "homepage_featured",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 864e5),
      priority: 10,
      active: true
    }
  });
  await prisma.campaign.create({
    data: {
      vendorId: paidV.vendor.id,
      placement: "homepage_premium",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 864e5),
      priority: 8,
      active: true
    }
  });
  await prisma.campaign.create({
    data: {
      vendorId: paidV.vendor.id,
      placement: "homepage_promo",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 864e5),
      priority: 6,
      active: true
    }
  });

  console.log("Seeded NaijaSpa. Demo password for all accounts: NaijaSpa!dev");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
