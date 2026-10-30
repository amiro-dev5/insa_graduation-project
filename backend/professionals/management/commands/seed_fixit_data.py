import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings
from PIL import Image, ImageDraw
from professionals.models import (
    City, SubCity, ServiceCategory, ProfessionalProfile, 
    ProfessionalCertificate, ProfessionalPortfolioItem
)
from accounts.models import CustomerProfile
from posts.models import Post, PostLike
from services.models import ServiceRequest, ServiceRequestRecipient
from reviews.models import Review
from wallet.models import Wallet, WalletTransaction

User = get_user_model()


def ensure_miss_dibora_portrait():
    media_dir = os.path.join(settings.MEDIA_ROOT, 'profiles', 'professionals')
    os.makedirs(media_dir, exist_ok=True)
    target_path = os.path.join(media_dir, 'miss_dibora.png')
    if os.path.exists(target_path):
        return 'profiles/professionals/miss_dibora.png'

    size = (512, 512)
    img = Image.new('RGBA', size, (241, 245, 249, 255))
    draw = ImageDraw.Draw(img)

    draw.ellipse([20, 20, 492, 492], fill=(224, 231, 255, 255))
    draw.ellipse([36, 36, 476, 476], fill=(238, 242, 255, 255))

    draw.ellipse([96, 360, 416, 680], fill=(30, 41, 59, 255))
    draw.polygon([(256, 390), (220, 360), (292, 360)], fill=(79, 70, 229, 255))
    draw.polygon([(256, 410), (236, 360), (276, 360)], fill=(99, 102, 241, 255))

    skin_color = (138, 86, 56, 255)
    skin_shadow = (112, 68, 43, 255)
    draw.rectangle([226, 290, 286, 380], fill=skin_shadow)
    draw.ellipse([228, 300, 284, 380], fill=skin_color)

    hair_color = (24, 20, 22, 255)
    hair_highlight = (45, 38, 42, 255)
    hair_glow = (60, 50, 55, 255)

    draw.ellipse([116, 70, 396, 330], fill=hair_color)
    draw.ellipse([100, 100, 240, 240], fill=hair_color)
    draw.ellipse([272, 100, 412, 240], fill=hair_color)
    draw.ellipse([110, 150, 210, 270], fill=hair_color)
    draw.ellipse([302, 150, 402, 270], fill=hair_color)
    draw.ellipse([160, 50, 352, 220], fill=hair_color)

    curl_positions = [
        (130, 110, 35), (115, 145, 34), (108, 185, 32), (112, 225, 30),
        (382, 110, 35), (397, 145, 34), (404, 185, 32), (400, 225, 30),
        (150, 75, 36), (190, 55, 38), (235, 45, 40), (277, 45, 40),
        (322, 55, 38), (362, 75, 36), (170, 60, 35), (342, 60, 35),
        (120, 260, 28), (392, 260, 28)
    ]
    for cx, cy, rad in curl_positions:
        draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=hair_color)

    for cx, cy, rad in curl_positions:
        draw.arc([cx - rad + 6, cy - rad + 6, cx + rad - 6, cy + rad - 6], 30, 180, fill=hair_highlight, width=4)

    face_left, face_top, face_right, face_bottom = 176, 150, 336, 325
    draw.ellipse([face_left, face_top, face_right, face_bottom], fill=skin_color)
    draw.polygon([(216, 290), (296, 290), (270, 332), (242, 332)], fill=skin_color)
    draw.ellipse([238, 320, 274, 336], fill=skin_color)

    draw.ellipse([168, 230, 188, 268], fill=skin_color)
    draw.ellipse([324, 230, 344, 268], fill=skin_color)
    draw.ellipse([174, 256, 182, 264], fill=(234, 179, 8, 255))
    draw.ellipse([330, 256, 338, 264], fill=(234, 179, 8, 255))

    draw.arc([192, 192, 236, 218], 190, 355, fill=(24, 20, 22, 255), width=4)
    draw.arc([276, 192, 320, 218], 185, 350, fill=(24, 20, 22, 255), width=4)

    draw.ellipse([200, 215, 232, 231], fill=(255, 255, 255, 255))
    draw.ellipse([208, 216, 226, 231], fill=(50, 30, 20, 255))
    draw.ellipse([213, 218, 221, 227], fill=(15, 10, 10, 255))
    draw.ellipse([217, 219, 220, 222], fill=(255, 255, 255, 255))

    draw.ellipse([280, 215, 312, 231], fill=(255, 255, 255, 255))
    draw.ellipse([286, 216, 304, 231], fill=(50, 30, 20, 255))
    draw.ellipse([291, 218, 299, 227], fill=(15, 10, 10, 255))
    draw.ellipse([295, 219, 298, 222], fill=(255, 255, 255, 255))

    draw.arc([198, 211, 234, 228], 190, 350, fill=(24, 20, 22, 255), width=3)
    draw.arc([278, 211, 314, 228], 190, 350, fill=(24, 20, 22, 255), width=3)

    draw.line([(256, 224), (252, 254)], fill=skin_shadow, width=2)
    draw.arc([244, 248, 268, 266], 20, 160, fill=skin_shadow, width=3)
    draw.ellipse([245, 257, 251, 263], fill=(80, 48, 30, 255))
    draw.ellipse([261, 257, 267, 263], fill=(80, 48, 30, 255))

    lip_color = (175, 82, 70, 255)
    lip_top = (155, 70, 60, 255)
    draw.chord([232, 276, 280, 298], 0, 180, fill=lip_color)
    draw.chord([234, 273, 278, 287], 180, 360, fill=lip_top)
    draw.line([(230, 281), (282, 281)], fill=(90, 38, 30, 255), width=2)

    forehead_curls = [
        (185, 165, 16), (205, 155, 18), (228, 148, 20),
        (256, 145, 20), (284, 148, 20), (307, 155, 18), (327, 165, 16)
    ]
    for cx, cy, rad in forehead_curls:
        draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=hair_color)
        draw.arc([cx - rad + 3, cy - rad + 3, cx + rad - 3, cy + rad - 3], 45, 200, fill=hair_glow, width=3)

    img.save(target_path, 'PNG')
    return 'profiles/professionals/miss_dibora.png'


class Command(BaseCommand):
    help = 'Seeds initial cities, categories, users, technicians, posts, and demo records for FixIt'

    def handle(self, *args, **options):
        self.stdout.write("Seeding FixIt reference and demo data...")

        # 1. Cities and Sub-Cities
        cities_data = {
            'Addis Ababa': [
                'Bole', 'Kirkos', 'Yeka', 'Arada', 'Gullele', 
                'Lideta', 'Kolfe Keranio', 'Nifas Silk-Lafto', 'Akaky Kaliti', 'Lemi Kura'
            ],
            'Dire Dawa': ['Sabian', 'Kebele 01', 'Gende Kore'],
            'Hawassa': ['Menehariya', 'Tabor', 'Hayek Dar', 'Misrak'],
            'Bahir Dar': ['Gishe Abay', 'Shimbit', 'Fasilo'],
            'Adama': ['Bole Subcity', 'Dembela', 'Geda'],
        }

        created_cities = {}
        created_subcities = {}
        for city_name, subcities in cities_data.items():
            city_obj, _ = City.objects.get_or_create(name=city_name, defaults={'is_active': True})
            created_cities[city_name] = city_obj
            for sc_name in subcities:
                sc_obj, _ = SubCity.objects.get_or_create(city=city_obj, name=sc_name, defaults={'is_active': True})
                created_subcities[f"{city_name}-{sc_name}"] = sc_obj

        # 2. Service Categories
        categories_data = [
            ('Electrical Repair', 'electrical-repair', 'Residential and commercial wiring, breaker fixes, generator and outlet repair', 'Zap'),
            ('Plumbing', 'plumbing', 'Pipe fitting, leak repairs, water heater installation, and drainage solutions', 'Wrench'),
            ('Ceramic & Tile Installation', 'ceramic-tile-installation', 'High quality wall and floor tiling, bathroom and kitchen remodeling', 'Grid'),
            ('Satellite Dish Installation & Repair', 'satellite-dish-installation', 'Satellite TV alignment, decoder configuration, dish mounting, signal troubleshooting', 'Tv'),
            ('Carpentry', 'carpentry', 'Custom furniture, door & window framing, wooden cabinetry, lock repairs', 'Hammer'),
            ('Painting', 'painting', 'Interior and exterior house painting, wall smoothing, decorative coats', 'Paintbrush'),
            ('Masonry & Construction', 'masonry-construction', 'Brickwork, concrete plastering, foundation repairs, and stonework', 'HardHat'),
            ('Appliance Repair', 'appliance-repair', 'Washing machine, refrigerator, microwave, and electric stove repair', 'Cpu'),
        ]

        cats = {}
        for name, slug, desc, icon in categories_data:
            cat_obj, _ = ServiceCategory.objects.get_or_create(
                slug=slug,
                defaults={'name': name, 'description': desc, 'icon_name': icon, 'is_active': True}
            )
            cats[slug] = cat_obj

        # 3. Superuser Admin
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@fixit.et',
                'first_name': 'FixIt',
                'last_name': 'Administrator',
                'role': User.ROLE_ADMIN,
                'phone_number': '+251911000000',
                'is_staff': True,
                'is_superuser': True
            }
        )
        admin_user.set_password('AdminPass123!')
        admin_user.save()

        # 4. Customer Demo Account
        aa_city = created_cities['Addis Ababa']
        bole = created_subcities.get('Addis Ababa-Bole')
        kirkos = created_subcities.get('Addis Ababa-Kirkos')
        yeka = created_subcities.get('Addis Ababa-Yeka')

        customer_user, _ = User.objects.get_or_create(
            username='abebe_customer',
            defaults={
                'first_name': 'Abebe',
                'last_name': 'Mengistu',
                'phone_number': '+251955667788',
                'email': 'abebe@example.com',
                'role': User.ROLE_CUSTOMER
            }
        )
        customer_user.set_password('DemoPass123!')
        customer_user.save()

        CustomerProfile.objects.get_or_create(
            user=customer_user,
            defaults={
                'city': aa_city,
                'subcity': bole,
                'address_details': 'Bole Medhanialem, Near Edna Mall, House 204'
            }
        )

        # 5. Exactly 5 Technician Demo Accounts
        # Ensure portrait file for Miss Dibora exists
        dibora_pic_path = ensure_miss_dibora_portrait()

        pros_seed = [
            {
                'username': 'miss_dibora',
                'first_name': 'Miss',
                'last_name': 'Dibora',
                'phone': '+251911889900',
                'subcity': bole,
                'category': 'appliance-repair',
                'bio': 'Certified appliance repair technician specializing in domestic washing machines, refrigerators, microwaves, and preventative motor servicing across Addis Ababa.',
                'cert_title': 'Level IV Household Electrical Appliance Maintenance',
                'cert_org': 'Federal TVET Agency',
                'exp': 7,
                'rating': 4.95,
                'jobs': 51,
                'profile_picture': dibora_pic_path
            },
            {
                'username': 'dawit_elec',
                'first_name': 'Dawit',
                'last_name': 'Haile',
                'phone': '+251911223344',
                'subcity': bole,
                'category': 'electrical-repair',
                'bio': 'Licensed master electrician with over 8 years of experience in residential circuitry, safety breakers, generator wiring, and smart lighting solutions in Addis Ababa.',
                'cert_title': 'Level IV Electrical Installation & Distribution',
                'cert_org': 'Ministry of Labor and Skills',
                'exp': 8,
                'rating': 4.90,
                'jobs': 42,
                'profile_picture': None
            },
            {
                'username': 'tigist_plumb',
                'first_name': 'Tigist',
                'last_name': 'Alemu',
                'phone': '+251922334455',
                'subcity': kirkos,
                'category': 'plumbing',
                'bio': 'Certified plumbing technician specializing in modern bathroom piping, high-pressure water pumps, solar water heater installation, and emergency leak resolution.',
                'cert_title': 'Level IV Building Plumbing and Sanitation Systems',
                'cert_org': 'Addis Ababa TVET Bureau',
                'exp': 6,
                'rating': 4.85,
                'jobs': 38,
                'profile_picture': None
            },
            {
                'username': 'solomon_carp',
                'first_name': 'Solomon',
                'last_name': 'Kebede',
                'phone': '+251933445566',
                'subcity': yeka,
                'category': 'carpentry',
                'bio': 'Experienced artisan carpenter focusing on custom kitchen cabinets, hardwood doors, custom closets, and precise lock fitting.',
                'cert_title': 'Level III Architectural Woodworking and Joinery',
                'cert_org': 'General Wingate TVET College',
                'exp': 10,
                'rating': 4.95,
                'jobs': 56,
                'profile_picture': None
            },
            {
                'username': 'yared_paint',
                'first_name': 'Yared',
                'last_name': 'Assefa',
                'phone': '+251966778899',
                'subcity': bole,
                'category': 'painting',
                'bio': 'Professional interior and exterior painting artisan with 8 years of expertise in wall skimming, anti-humidity priming, color matching, and fine decorative coatings.',
                'cert_title': 'Level III Surface Finishing and Architectural Coatings',
                'cert_org': 'Tegbare-Id Polytechnic College',
                'exp': 8,
                'rating': 4.88,
                'jobs': 34,
                'profile_picture': None
            }
        ]

        pro_user_map = {}
        for p in pros_seed:
            u, _ = User.objects.get_or_create(
                username=p['username'],
                defaults={
                    'first_name': p['first_name'],
                    'last_name': p['last_name'],
                    'phone_number': p['phone'],
                    'email': f"{p['username']}@fixit.et",
                    'role': User.ROLE_PROFESSIONAL
                }
            )
            u.first_name = p['first_name']
            u.last_name = p['last_name']
            u.set_password('DemoPass123!')
            u.save()
            pro_user_map[p['username']] = u

            profile, _ = ProfessionalProfile.objects.get_or_create(
                user=u,
                defaults={
                    'city': aa_city,
                    'subcity': p['subcity'],
                    'bio': p['bio'],
                    'experience_years': p['exp'],
                    'service_area_description': f"Serving {p['subcity'].name} and surrounding areas",
                    'verification_status': ProfessionalProfile.STATUS_APPROVED,
                    'average_rating': p['rating'],
                    'completed_jobs_count': p['jobs']
                }
            )

            # Ensure profile picture is set for Miss Dibora
            if p.get('profile_picture'):
                profile.profile_picture = p['profile_picture']
                profile.save(update_fields=['profile_picture'])

            profile.categories.add(cats[p['category']])

            # Ensure approved certificate
            cert_obj, _ = ProfessionalCertificate.objects.get_or_create(
                professional=profile,
                title=p['cert_title'],
                defaults={
                    'issued_by': p['cert_org'],
                    'is_verified': True,
                    'certificate_file': 'certificates/cert.pdf'
                }
            )

            # Ensure wallet balance
            wallet, w_created = Wallet.objects.get_or_create(
                professional=profile,
                defaults={'balance': Decimal('500.00')}
            )
            if w_created or wallet.balance < Decimal('100.00'):
                wallet.balance = Decimal('500.00')
                wallet.save(update_fields=['balance'])
                WalletTransaction.objects.get_or_create(
                    reference=f"FIXIT-TOPUP-SEED-{profile.id}",
                    defaults={
                        'wallet': wallet,
                        'transaction_type': WalletTransaction.TYPE_TOPUP,
                        'amount': Decimal('500.00'),
                        'balance_after': Decimal('500.00'),
                        'status': WalletTransaction.STATUS_SUCCESS,
                        'payment_method': 'Chapa Test Checkout',
                        'description': 'Initial Demo Top-Up'
                    }
                )

        # 6. Exactly 10 Technician Posts (2 per technician, 7 English, 3 Amharic)
        posts_seed = [
            # Tigist Alemu (Plumbing) - 2 English
            (
                'tigist_plumb',
                "Inspected and addressed a series of hidden PPR joint leaks in a Bole residential villa. Periodic water pressure checks and quality heat-fusion joints prevent dampness and structural damage to internal walls."
            ),
            (
                'tigist_plumb',
                "Quick maintenance tip for continuous tap dripping: mineral buildup on ceramic cartridges or worn rubber washers are the most common culprits. Replacing them early avoids water waste and excessive pump cycling."
            ),
            # Dawit Haile (Electrical Repair) - 1 English, 1 Amharic
            (
                'dawit_elec',
                "Residential electrical safety reminder: test your residual current circuit breakers (RCBOs) every month using the built-in test button to ensure trip sensitivity against ground faults."
            ),
            (
                'dawit_elec',
                "የቤት ውስጥ የኤሌክትሪክ መስመሮች ደህንነትን ለመጠበቅ ጥንቃቄ ማድረግ ወሳኝ ነው። የቆጣሪዎች ድንገተኛ መጥፋት ካጋጠመዎት ከመጠን በላይ ኃይል የሚወስዱ እቃዎችን በመለየት እና ተገቢውን የሙያ ምርመራ በማድረግ የእሳት አደጋን መከላከል ይቻላል።"
            ),
            # Solomon Kebede (Carpentry) - 2 English
            (
                'solomon_carp',
                "Maintaining exterior hardwood doors against seasonal temperature shifts: apply UV-rated penetrating oil sealant annually to stop swelling, warping, and latch misalignment."
            ),
            (
                'solomon_carp',
                "Completed solid timber door adjustments for an apartment in Yeka. Correcting hinge mortise depth and shimming frames restores effortless swing without damaging wooden flooring."
            ),
            # Miss Dibora (Appliance Repair) - 1 Amharic, 1 English
            (
                'miss_dibora',
                "የልብስ ማጠቢያ ማሽኖች እና ፍሪጆች ረጅም ጊዜ እንዲያገለግሉ የመከላከያ ጥገና ወሳኝ ነው። የማጣሪያዎችን ንፅህና በየወሩ መፈተሽ እና የኮምፕረሰር አየር ማስተላለፊያዎችን ከአቧራ ነፃ ማድረግ የኃይል ፍጆታን በከፍተኛ መጠን ይቀንሳል።"
            ),
            (
                'miss_dibora',
                "Preventative care for modern refrigerators: keep rear condenser coils clean from dust accumulation. Overheating coils force compressors to run continuously, shortening appliance lifespan."
            ),
            # Yared Assefa (Painting) - 1 English, 1 Amharic
            (
                'yared_paint',
                "Successful painting starts with flawless wall preparation. Scraping loose plaster, applying acrylic sealer primer, and thorough fine-grit sanding ensures vibrant and durable finishes."
            ),
            (
                'yared_paint',
                "የተቀቡ የቤት ውስጥ ግድግዳዎችን ውበት ለመጠበቅ እርጥበት አዘል በሆኑ ክፍሎች ውስጥ ፀረ-ፈንገስ እና ውሃ ተከላካይ ቀለሞችን መጠቀም ይመረጣል። ግድግዳዎችን በቀስታ ለስላሳ ጨርቅ ማፅዳት የቀለሙን እድሜ ያረዝማል።"
            )
        ]

        total_posts_created = 0
        for username, content in posts_seed:
            author = pro_user_map[username]
            post, created = Post.objects.get_or_create(author=author, content=content)
            if created:
                total_posts_created += 1
            # Give a like from customer
            PostLike.objects.get_or_create(post=post, user=customer_user)

        self.stdout.write(f"Processed 10 demo posts (Created new: {total_posts_created})")

        # 7. Seed Sample Completed Jobs & Reviews for Verified Trust Scores
        sample_jobs = [
            (
                'miss_dibora',
                'appliance-repair',
                'Refrigerator Cooling and Thermostat Diagnostic',
                'Diagnosed faulty defrost timer and replaced bi-metal thermostat on commercial refrigerator.',
                5,
                'Miss Dibora was extraordinarily professional, prompt, and solved our refrigeration issue on the first visit. Highly recommended!'
            ),
            (
                'dawit_elec',
                'electrical-repair',
                'Main Breaker Panel Upgrade & Grounding',
                'Installed 8-way distribution board with individual RCBO circuit breakers and verified earth grounding resistance.',
                5,
                'Dawit completed the breaker upgrade cleanly and efficiently. Clear explanations and adherence to safety standards.'
            ),
            (
                'tigist_plumb',
                'plumbing',
                'Booster Pump Installation & Bathroom Line Plumbing',
                'Installed automatic 0.75HP booster pump and connected bypass valve for uninterrupted water pressure.',
                5,
                'Tigist did an outstanding plumbing installation. The water pressure issue was completely solved.'
            ),
            (
                'solomon_carp',
                'carpentry',
                'Custom Hardwood Wardrobe Installation',
                'Built and fitted custom 3-door solid mahogany wardrobe with soft-closing hinges and drawer organizers.',
                5,
                'Master craftsmanship! The wardrobe finish is flawless and solid. Solomon is a true artisan.'
            ),
            (
                'yared_paint',
                'painting',
                'Full Living Room Skimming & Silk Emulsion Painting',
                'Repaired moisture damages, skim coated walls, and applied two coats of silk washable acrylic paint.',
                5,
                'Yared transformed our living room. Clean edges, smooth wall finish, and left the room spotless.'
            )
        ]

        for username, cat_slug, title, desc, rating, comment in sample_jobs:
            pro_user = pro_user_map[username]
            cat_obj = cats[cat_slug]
            req, req_created = ServiceRequest.objects.get_or_create(
                customer=customer_user,
                accepted_professional=pro_user,
                title=title,
                defaults={
                    'category': cat_obj,
                    'city': aa_city,
                    'subcity': bole,
                    'description': desc,
                    'service_address': 'Bole Medhanialem, House 204',
                    'status': ServiceRequest.STATUS_COMPLETED
                }
            )
            if req_created:
                req.status = ServiceRequest.STATUS_COMPLETED
                req.save()

            Review.objects.get_or_create(
                service_request=req,
                reviewer=customer_user,
                defaults={
                    'reviewee': pro_user,
                    'rating': rating,
                    'comment': comment
                }
            )

        self.stdout.write(self.style.SUCCESS("FixIt demo seed data created successfully!"))
