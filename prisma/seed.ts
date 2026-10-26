import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_COMMERCIAL } from "../src/lib/commercial";
import { DEFAULT_GALLERY_CONFIG } from "../src/lib/galleries";
import { DEFAULT_HOME_HERO, DEFAULT_HERO_ADS, DEFAULT_HERO_AD_DISPLAY_LIMIT, HERO_AD_LIMIT_KEY } from "../src/lib/home-hero";
import { DEFAULT_HOME_FEED_CONFIG, HOME_FEED_CONFIG_KEYS } from "../src/lib/home-types";
import { LIVE_MEMBERSHIP_PLANS, serializeBenefits } from "../src/lib/membership";
import { LIVE_VENDOR_PLANS } from "../src/lib/vendor-plans";

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
    paidPlanPricesNote: "Paid plan prices below are seed placeholders for local development. Change them in Admin → Commercial config before production.",
    galleryMaxImagesPerGallery: String(DEFAULT_GALLERY_CONFIG.maxImagesPerGallery),
    galleryMaxImageBytes: String(DEFAULT_GALLERY_CONFIG.maxImageBytes),
    [HOME_FEED_CONFIG_KEYS.featured]: String(DEFAULT_HOME_FEED_CONFIG.featured),
    [HOME_FEED_CONFIG_KEYS.premium]: String(DEFAULT_HOME_FEED_CONFIG.premium),
    [HOME_FEED_CONFIG_KEYS.promo]: String(DEFAULT_HOME_FEED_CONFIG.promo),
    [HOME_FEED_CONFIG_KEYS.nearby]: String(DEFAULT_HOME_FEED_CONFIG.nearby),
    [HERO_AD_LIMIT_KEY]: String(DEFAULT_HERO_AD_DISPLAY_LIMIT)
  };
  for (const [key, value] of Object.entries(config)) {
    await prisma.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  const planRows: Record<string, { id: string }> = {};
  for (const plan of LIVE_VENDOR_PLANS) {
    const row = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        durationDays: plan.durationDays,
        publicDirectContact: plan.publicDirectContact,
        enhancedVisibility: plan.enhancedVisibility,
        sponsoredEligible: plan.sponsoredEligible
      },
      create: {
        code: plan.code,
        name: plan.name,
        durationDays: plan.durationDays,
        priceKobo: plan.priceKobo,
        commissionBps: plan.commissionBps,
        publicDirectContact: plan.publicDirectContact,
        enhancedVisibility: plan.enhancedVisibility,
        sponsoredEligible: plan.sponsoredEligible,
        unlimitedListings: true
      }
    });
    planRows[plan.code] = row;
  }
  const free = planRows.FREE;

  const roles = [
    ["super.admin@naijaspa.com", "Amaka Obi", "super_admin"],
    ["ops@naijaspa.com", "Chinedu Bassey", "operations_admin"],
    ["verify@naijaspa.com", "Zainab Lawal", "verification_officer"],
    ["support@naijaspa.com", "Tola Adeyemi", "support_agent"],
    ["finance@naijaspa.com", "Ifeanyi Okonkwo", "finance_officer"],
    ["content@naijaspa.com", "Ngozi Eze", "content_manager"],
    ["marketing@naijaspa.com", "Halima Bello", "marketing_manager"],
    ["moderator@naijaspa.com", "Kunle Salami", "moderator"],
    ["analyst@naijaspa.com", "Ruth Danjuma", "analyst"],
    ["customer@naijaspa.com", "Adaeze Nwosu", "customer"]
  ] as const;

  const users: Record<string, string> = {};
  for (const [email, name, role] of roles) {
    const u = await prisma.user.upsert({
      where: { email },
      update: { role, status: "active" },
      create: { email, name, role, passwordHash, status: "active", emailVerifiedAt: new Date(), locale: "en", theme: "light" }
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
      update: {
        coverUrl: "/photos/band-spa.jpg",
        state: opts.city === "Abuja" ? "FCT" : "Lagos",
        city: opts.city,
        neighbourhood: opts.area
      },
      create: {
        ownerId: owner.id,
        slug: opts.slug,
        businessName: opts.business,
        description: `${opts.business} offers professional spa and wellness treatments in ${opts.area}, ${opts.city}.`,
        state: opts.city === "Abuja" ? "FCT" : "Lagos",
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
    const plan = opts.paid ? await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "GOLD" } }) : free;
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
    const staffGender = opts.paid ? "female" : "male";
    const existingStaff = await prisma.vendorStaff.findFirst({ where: { vendorId: vendor.id } });
    const staff =
      existingStaff ??
      (await prisma.vendorStaff.create({
        data: {
          vendorId: vendor.id,
          name: `${opts.name.split(" ")[0]} Therapist`,
          title: "Lead therapist",
          gender: staffGender
        }
      }));
    if (existingStaff && existingStaff.gender !== staffGender) {
      await prisma.vendorStaff.update({ where: { id: existingStaff.id }, data: { gender: staffGender } });
    }
    if (!existingStaff) {
      for (let d = 0; d < 7; d++) {
        await prisma.availabilitySlot.create({
          data: { vendorId: vendor.id, staffId: staff.id, weekday: d, startMin: 9 * 60, endMin: 20 * 60, bufferMin: 15 }
        });
      }
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
    email: "paid.vendor@naijaspa.com",
    name: "Kemi Osun",
    business: "Osun Wellness Spa",
    slug: "osun-wellness",
    city: "Lagos",
    area: "Lekki",
    paid: true,
    phone: "+2348011111111"
  });
  const freeV = await makeVendor({
    email: "free.vendor@naijaspa.com",
    name: "Ibrahim Musa",
    business: "Calm House Ikeja",
    slug: "calm-house-ikeja",
    city: "Lagos",
    area: "Ikeja",
    paid: false,
    phone: "+2348022222222"
  });

  async function seedGallery(
    vendorId: string,
    title: string,
    caption: string,
    images: Array<{ url: string; therapistName: string; caption: string }>,
    videos: Array<{ url: string; title: string }>
  ) {
    const existing = await prisma.therapistGallery.findFirst({ where: { vendorId, title } });
    if (existing) return;
    await prisma.therapistGallery.create({
      data: {
        vendorId,
        title,
        caption,
        images: { create: images.map((img, i) => ({ ...img, sortOrder: i })) }
      }
    });
    if (videos.length) {
      const videoCount = await prisma.vendorVideoLink.count({ where: { vendorId } });
      if (videoCount === 0) {
        await prisma.vendorVideoLink.createMany({
          data: videos.map((v, i) => ({ vendorId, url: v.url, title: v.title, sortOrder: i }))
        });
      }
    }
  }

  await seedGallery(
    paidV.vendor.id,
    "Lekki therapists",
    "Resident team at Osun Wellness.",
    [
      { url: "/photos/massage.jpg", therapistName: "Kemi Osun", caption: "Lead therapist" },
      { url: "/photos/spa.jpg", therapistName: "Adaeze Cole", caption: "Deep tissue" }
    ],
    [{ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Studio tour" }]
  );
  await seedGallery(
    freeV.vendor.id,
    "Ikeja team",
    "Calm House therapists.",
    [{ url: "/photos/facials.jpg", therapistName: "Ibrahim Musa", caption: "Facials" }],
    []
  );

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

  for (const plan of LIVE_MEMBERSHIP_PLANS) {
    await prisma.membershipPlan.upsert({
      where: { code: plan.code },
      update: {},
      create: {
        code: plan.code,
        name: plan.name,
        interval: plan.interval,
        priceKobo: plan.priceKobo,
        benefits: serializeBenefits(plan.benefits),
        active: true
      }
    });
  }
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
      { key: "contact", title: "Contact", body: "Maitama, Abuja · concierge@naijaspa.com" },
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

  await prisma.homeHero.upsert({
    where: { id: "home" },
    update: {},
    create: { id: "home", ...DEFAULT_HOME_HERO }
  });
  const heroAdCount = await prisma.heroAd.count();
  if (heroAdCount === 0) {
    await prisma.heroAd.createMany({
      data: DEFAULT_HERO_ADS.map((ad, i) => ({
        title: ad.title,
        body: ad.body,
        imageUrl: ad.imageUrl,
        ctaLabel: ad.ctaLabel,
        ctaHref: ad.ctaHref,
        sortOrder: i,
        active: true,
        vendorId: i === 0 ? paidV.vendor.id : null
      }))
    });
  }

  console.log("Seeded NaijaSpa. Demo password for all accounts: NaijaSpa!dev");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
