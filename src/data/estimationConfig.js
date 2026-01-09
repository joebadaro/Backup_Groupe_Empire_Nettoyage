/**
 * CONFIGURATION CENTRALE - PROTOTYPE (RÈGLES AVANCÉES)
 */

export const CONFIG = {
    pricing: {
        minimumOrder: 179.00,
        currency: "CAD",
        taxRate: 0.14975,
        mattressDiscount: 0.30 // 30% off additional mattresses
    },

    text: {
        title: {
            fr: "Estimation Gratuite",
            en: "Free Estimate"
        },
        chooseServices: {
            fr: "Choisissez vos services",
            en: "Choose your services"
        },
        getImmediate: {
            fr: "Obtenez votre estimation immédiate",
            en: "Get your instant estimate"
        },
        selectBelow: {
            fr: "Sélectionnez les services ci-dessous pour voir les tarifs et obtenir un prix approximatif pour vos besoins.",
            en: "Select the services below to view rates and get an approximate price for your needs."
        },
        mySelection: {
            fr: "Ma Sélection",
            en: "My Selection"
        },
        subtitle: {
            fr: "Choisissez vos services. Cliquez sur les icônes pour commencer.",
            en: "Choose your services. Click icons to start."
        },
        currencySymbol: "$",
        minOrderLabel: {
            fr: "Achat minimum de 179$ (incluant déplacement)",
            en: "Minimum order of $179 (includes travel)"
        },
        minOrderPrompt: {
            fr: "Voulez-vous ajouter quelque chose ?",
            en: "Would you like to add anything?"
        },
        discountMessage: {
            fr: "Rabais appliqué !",
            en: "Discount applied!"
        },
        minOrderExplanation: {
            fr: "L’achat minimal pour un nettoyage à domicile est de 179 $.",
            en: "The minimum order for home cleaning is $179."
        },
        upsellMessage: {
            fr: "Comme vous payez déjà l’achat minimal, vous pouvez ajouter d’autres articles au besoin, souvent à prix réduit, puisque nous sommes déjà sur place.",
            en: "Since you are already paying the minimum, you can add other items as needed, often at a reduced price, as we are already on site."
        },
        selectedArticles: {
            fr: "Articles sélectionnés :",
            en: "Selected items:"
        },
        totalService: {
            fr: "Total pour ce service :",
            en: "Total for this service:"
        },
        totalSavings: {
            fr: "Économies totales:",
            en: "Total savings:"
        },
        cartEmpty: {
            fr: "Votre panier est vide",
            en: "Your cart is empty"
        },
        steps: {
            welcome: { fr: "Services", en: "Services" },
            details: { fr: "Détails", en: "Details" },
            summary: { fr: "Résumé", en: "Summary" }
        },
        buttons: {
            next: { fr: "Suivant", en: "Next" },
            finaliser: { fr: "Finaliser la demande de devis", en: "Finalize Quote Request" },
            back: { fr: "Retour", en: "Back" },
            backFull: { fr: "Retour en arrière", en: "Go Back" },
            print: { fr: "Imprimer cette page", en: "Print this page" },
            send: { fr: "Envoyer", en: "Send" },
            add: { fr: "Ajouter", en: "Add" },
            remove: { fr: "Retirer", en: "Remove" }
        },
        promos: {
            mattress: {
                fr: "Obtenez <span class=\"promo-highlight\">30% de rabais</span> sur chaque matelas additionnel !",
                en: "Get <span class=\"promo-highlight\">30% off</span> every additional mattress!"
            },
            sofa3: {
                fr: "Obtenez <span class=\"promo-highlight\">30% de rabais</span> sur le 2e sofa !",
                en: "Get <span class=\"promo-highlight\">30% off</span> the 2nd sofa!"
            },
            sofa2: {
                fr: "Obtenez <span class=\"promo-highlight\">15% de rabais</span> sur la 2e causeuse !",
                en: "Get <span class=\"promo-highlight\">15% off</span> the 2nd loveseat!"
            },
            rugs: {
                fr: "Obtenez <span class=\"promo-highlight\">50% de rabais</span> sur tout nettoyage de tapis additionnel !",
                en: "Get <span class=\"promo-highlight\">50% off</span> any additional rug cleaning!"
            },
            sectional: {
                fr: "💎 Rabais de 10% appliqué !",
                en: "💎 10% Discount Applied!"
            },
            residentialCarpet: {
                fr: "💎 Le 3e tapis est à <span class=\"promo-highlight\">30$ de rabais</span> !",
                en: "💎 3rd carpet is <span class=\"promo-highlight\">$30 off</span>!"
            }
        }
    },

    services: [
        {
            id: "meubles",
            label: { fr: "Meubles en tissu", en: "Upholstery" },
            icon: `<img src="/images/service-meubles.webp" alt="Meubles en tissu" loading="lazy" />`,
            items: [
                {
                    id: "chaise",
                    label: { fr: "Chaise de cuisine ou chaise équivalente", en: "Kitchen Chair or equivalent" },
                    price: 29.00,
                    desc: { fr: "29$ par chaise", en: "$29 per chair" }
                },
                {
                    id: "fauteuil",
                    label: { fr: "Fauteuil 1 place", en: "Armchair (1 seat)" },
                    price: 79.00,
                    desc: { fr: "", en: "" }
                },
                {
                    id: "sofa_2",
                    label: { fr: "Causeuse / sofa 2 places", en: "Loveseat / 2-seater" },
                    price: 99.00,
                    desc: { fr: "", en: "" }
                },
                {
                    id: "sofa_3",
                    label: { fr: "Sofa 3 places", en: "Sofa (3 seats)" },
                    price: 149.00,
                    desc: { fr: "", en: "" }
                },
                {
                    id: "sectionnel",
                    label: { fr: "Sectionnel ou sofa en L", en: "Sectional or L-shaped sofa" },
                    type: "sectional_variable",
                    desc: { fr: "Sélectionnez le nombre de places assises total", en: "Select total number of seats" },
                    options: [
                        { val: 3, label: { fr: "3 places allongée (équivalent 4) (209 $)", en: "3 seats w/ chaise (equivalent 4) ($209)" }, price: 209 },
                        { val: 5, label: { fr: "5 places (249 $)", en: "5 seats ($249)" }, price: 249 },
                        { val: 6, label: { fr: "6 places (294 $)", en: "6 seats ($294)" }, price: 294 },
                        { val: 7, label: { fr: "7 places (339 $)", en: "7 seats ($339)" }, price: 339 }
                    ],
                    price: 0 // handled by options
                }
            ]
        },
        {
            id: "meubles_cuir",
            label: { fr: "Meubles en Cuir", en: "Leather Furniture" },
            icon: `<img src="/images/service-cuir.webp" alt="Meubles en cuir" loading="lazy" />`,
            items: [
                {
                    id: "cuir_fauteuil",
                    label: { fr: "Fauteuil 1 place (Cuir)", en: "Armchair (1 seat) - Leather" },
                    price: 109.00,
                    desc: { fr: "", en: "" }
                },
                {
                    id: "cuir_causeuse",
                    label: { fr: "Causeuse / Sofa 2 places (Cuir)", en: "Loveseat / 2-seater - Leather" },
                    price: 139.00,
                    desc: { fr: "", en: "" }
                },
                {
                    id: "cuir_sofa",
                    label: { fr: "Sofa 3 places (Cuir)", en: "Sofa (3 seats) - Leather" },
                    price: 189.00,
                    desc: { fr: "", en: "" }
                },
                {
                    id: "cuir_sectionnel",
                    label: { fr: "Sectionnel ou sofa en L en cuir", en: "Leather Sectional" },
                    type: "sectional_variable",
                    desc: { fr: "Sélectionnez le nombre de places assises total", en: "Select total number of seats" },
                    options: [
                        { val: 3, label: { fr: "3 places allongée (équivalent 4) (259 $)", en: "3 seats w/ chaise (equivalent 4) ($259)" }, price: 259 },
                        { val: 5, label: { fr: "5 places (319 $)", en: "5 seats ($319)" }, price: 319 },
                        { val: 6, label: { fr: "6 places (384 $)", en: "6 seats ($384)" }, price: 384 },
                        { val: 7, label: { fr: "7 places (449 $)", en: "7 seats ($449)" }, price: 449 }
                    ],
                    price: 0
                }
            ]
        },
        {
            id: "matelas",
            label: { fr: "Matelas", en: "Mattress" },
            icon: `<img src="/images/service-matelas.webp" alt="Matelas" loading="lazy" />`,
            items: [
                { id: "mat_king", label: { fr: "Matelas King", en: "King Mattress" }, price: 179.00 },
                { id: "mat_queen", label: { fr: "Matelas Queen", en: "Queen Mattress" }, price: 149.00 },
                { id: "mat_double", label: { fr: "Matelas Double", en: "Double Mattress" }, price: 129.00 },
                { id: "mat_simple", label: { fr: "Matelas Simple", en: "Single Mattress" }, price: 99.00 }
            ]
        },
        {
            id: "tapis_mur",
            label: { fr: "Tapis Mur-à-mur", en: "Wall-to-wall Carpet" },
            promoKey: "residentialCarpet",
            icon: `<img src="/images/service-tapis-mur.webp" alt="Tapis mur-à-mur" loading="lazy" />`,
            items: [
                {
                    id: "package_3rooms",
                    label: { fr: "Forfait: 3 pièces (Max 175pi²/ch)", en: "Package: 3 rooms (Max 175sqft/rm)" },
                    price: 195.00,
                    type: "checkbox",
                    desc: { fr: "Inclus 3 pièces", en: "Includes 3 rooms" },
                    promoLabel: { fr: "Rabais Forfait", en: "Package Discount" }
                },
                {
                    id: "room_individual",
                    label: { fr: "Combien de pièces à nettoyer ?", en: "How many rooms to clean?" },
                    price: 75.00,
                    type: "input_qty",
                    desc: { fr: "75 $ chaque pièce (Maximum 175 pieds carrés chaque)", en: "$75 per room (Maximum 175 sq ft each)" }
                },
                {
                    id: "hallway",
                    label: { fr: "Passage / Couloir", en: "Hallway / Corridor" },
                    price: 39.00,
                    type: "input_qty",
                    desc: { fr: "39$ / par passage (Max 80 pi²)", en: "$39 / per hallway (Max 80 sqft)" }
                },
                {
                    id: "marche",
                    label: { fr: "Marches en tapis", en: "Carpet Stairs" },
                    cartLabel: { fr: "Marches", en: "Stairs" },
                    price: 5.00,
                    type: "input_qty",
                    desc: { fr: "5$ / marche", en: "$5 / stair" }
                },
                {
                    id: "palier",
                    label: { fr: "Paliers en tapis", en: "Carpet Landings" },
                    cartLabel: { fr: "Paliers", en: "Landings" },
                    price: 20.00,
                    type: "input_qty",
                    desc: { fr: "20$ / palier (env. 5x5 pi)", en: "$20 / landing (approx 5x5 ft)" }
                }
            ]
        },
        {
            id: "tapis",
            label: { fr: "Nettoyage de Tapis et Carpettes", en: "Area Rug Cleaning" },
            icon: `<img src="/images/service-tapis.webp" alt="Tapis et carpettes" loading="lazy" />`,
            items: [
                {
                    id: "rug_synth",
                    label: { fr: "Tapis et carpettes synthétiques", en: "Synthetic Area Rugs" },
                    type: "multi_rug_calculator",
                    pricePerSqFt: 1.85,
                    desc: { fr: "1,85$ / pi²", en: "$1.85 / sqft" },
                    baseLabel: { fr: "Tapis Synth.", en: "Synth. Rug" }
                },
                {
                    id: "rug_wool",
                    label: { fr: "Tapis et carpettes en laine", en: "Wool Area Rugs" },
                    type: "multi_rug_calculator",
                    pricePerSqFt: 2.25,
                    desc: { fr: "2,25$ / pi²", en: "$2.25 / sqft" },
                    baseLabel: { fr: "Tapis Laine", en: "Wool Rug" }
                }
            ]
        },
        {
            id: "ceramique",
            label: { fr: "Tuiles & Céramique", en: "Tile & Grout" },
            icon: `<img src="/images/service-ceramique.webp" alt="Céramique" loading="lazy" />`,
            items: [
                {
                    id: "tiles_sqft",
                    label: { fr: "Surface à nettoyer (pi²)", en: "Area to clean (sqft)" },
                    type: "tile_calculator",
                    price: 2.15,
                    desc: { fr: "Min. facturable 150 pi²", en: "Min. billable 150 sqft" },
                    forms: {
                        totalTitle: { fr: "Superficie totale (pieds carrés (pi²)) :", en: "Total area (square feet (sqft)):" },
                        roomTitle: { fr: "Nombre de pièces :", en: "Number of rooms:" },
                        instruct: { fr: "Indiquez les dimensions pour chaque pièce :", en: "Enter dimensions for each room:" },
                        calculated: { fr: "Total calculé :", en: "Calculated Total:" },
                        modes: {
                            total: { fr: "Saisie directe (Total)", en: "Direct Input (Total)" },
                            rooms: { fr: "Calculateur par pièce", en: "Room Calculator" }
                        }
                    },
                    promoLabel: { fr: "Rabais Volume Céramique", en: "Tile Volume Discount" }
                }
            ]
        },
        {
            id: "escalier",
            label: { fr: "Marche en tapis", en: "Carpet Stairs" },
            icon: `<img src="/images/service-escalier.webp" alt="Escalier" loading="lazy" />`,
            items: [
                {
                    id: "marche",
                    label: { fr: "Combien de marches vous avez à nettoyer ?", en: "How many stairs to clean?" },
                    cartLabel: { fr: "Marches", en: "Stairs" },
                    price: 5.00,
                    type: "input_qty",
                    desc: { fr: "5$ / marche", en: "$5 / stair" }
                },
                {
                    id: "palier",
                    label: { fr: "Combien de paliers vous avez à nettoyer ?", en: "How many landings to clean?" },
                    cartLabel: { fr: "Paliers", en: "Landings" },
                    price: 20.00,
                    type: "input_qty",
                    desc: { fr: "20$ / palier (env. 5x5 pi)", en: "$20 / landing (approx 5x5 ft)" }
                }
            ]
        },
        {
            id: "tapis_commercial",
            label: { fr: "Nettoyage de Tapis Commercial", en: "Commercial Carpet Cleaning" },
            icon: `<img src="/images/service-tapis-commercial-custom.jpg" alt="Nettoyage Commercial" style="object-fit:cover;" loading="lazy" />`,
            isQuoteOnly: true, // Special flag for Quote Mode
            longDescription: {
                fr: `<strong>Soumission commerciale – fonctionnement</strong><br><br>
Pour une demande d’estimation commerciale, nous calculons selon la superficie totale à nettoyer, en pieds carrés.<br>
Si vous avez des marches, des meubles, des chaises ou d’autres éléments à ajouter, vous pouvez simplement les mentionner dans la section « Notes ».<br><br>
Un agent communiquera ensuite avec vous — par téléphone ou par courriel, selon votre préférence — afin de finaliser votre demande.<br><br>
Comme il existe de nombreuses variables en milieu commercial (type de nettoyage, produits utilisés, équipements, horaire, distance, etc.), ce module ne peut pas fournir un prix exact immédiatement. Indiquez-nous simplement la grandeur de l’espace et ce qu’il y a à nettoyer.<br>
Après avoir échangé avec vous, nous pourrons vous donner une estimation plus précise et adaptée à votre situation.`,
                en: `<strong>Commercial Quote – How it works</strong><br><br>
For a commercial estimate request, we calculate based on the total area to be cleaned, in square feet.<br>
If you have stairs, furniture, chairs, or other items to add, simply mention them in the 'Notes' section.<br><br>
An agent will then contact you — by phone or email, depending on your preference — to finalize your request.<br><br>
Since there are many variables in a commercial setting (type of cleaning, products used, equipment, schedule, distance, etc.), this module cannot provide an exact price immediately. Simply indicate the size of the space and what needs cleaning.<br>
After discussing with you, we will be able to give you a more accurate estimate tailored to your situation.`
            },
            items: [
                {
                    id: "comm_sqft",
                    label: { fr: "Surface du tapis (pieds carrés)", en: "Carpet Area (sq ft)" },
                    type: "input_number",
                    desc: { fr: "Entrez la surface approximative", en: "Enter approximate area" },
                    price: 0
                }
            ]
        }
    ]
};
