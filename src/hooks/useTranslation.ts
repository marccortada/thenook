import { createContext, useContext, useState, useEffect } from "react";

// Translation keys and values
const translations = {
  es: {
    // Header
    "admin": "Admin",
    "back": "Volver",
    
    // Landing Page
    "wellness_center": "Centro de Bienestar",
    "landing_subtitle": "Descubre la armonía perfecta entre relajación y bienestar en nuestro exclusivo centro de masajes",
    "book_appointment": "Reservar Cita",
    "gift_cards": "Tarjetas Regalo",
    "our_services": "Nuestros Servicios",
    "services_subtitle": "Ofrecemos una amplia gama de tratamientos diseñados para tu bienestar",
    "individual_massages": "Masajes Individuales",
    "individual_description": "Tratamientos personalizados para tu bienestar personal",
    "couples_massages": "Masajes para Parejas",
    "couples_description": "Momentos especiales para compartir en pareja",
    "special_rituals": "Rituales Especiales",
    "rituals_description": "Experiencias únicas para una relajación profunda",
    "contact_us": "Contáctanos",
    "contact_subtitle": "Estamos aquí para ayudarte a encontrar tu momento de bienestar",
    "location": "Ubicación",
    "location_description": "Encuentra nuestro centro de bienestar en el corazón de Madrid",
    "view_maps": "Ver en Maps",
    "hours": "Horarios",
    "book_now": "Reservar Ahora",
    "rights_reserved": "Todos los derechos reservados",
    
    // Massage Types
    "relaxing_massage": "Masaje Relajante",
    "therapeutic_massage": "Masaje Descontracturante",
    "foot_reflexology": "Reflexología Podal",
    "sports_massage": "Masaje Deportivo",
    "couples_massage": "Masaje para Dos Personas",
    "romantic_ritual": "Ritual Romántico",
    "hot_stones": "Masaje con Piedras Calientes",
    "bamboo_therapy": "Bambuterapia",
    "kobido_ritual": "Ritual del Kobido",
    "sakura_ritual": "Ritual Sakura",
    "energizing_ritual": "Ritual Energizante",
    "beauty_ritual": "Ritual Beauty",
    
    // Buy Voucher Page
    "buy_voucher": "Comprar Bono",
    "voucher_subtitle": "Elige el bono y completa los datos del beneficiario",
    "voucher": "Bono",
    "select_voucher": "Selecciona un bono",
    "four_hands_massages": "Masajes a Cuatro Manos",
    "rituals": "Rituales",
    "for_two_people": "Bonos para Dos Personas",
    "no_individual_vouchers": "No hay bonos individuales",
    "no_four_hands_vouchers": "No hay bonos a cuatro manos",
    "no_ritual_vouchers": "No hay bonos de rituales",
    "no_two_people_vouchers": "No hay bonos para dos",
    "who_for": "¿Para quién es?",
    "for_me": "Para mí",
    "its_gift": "Es un regalo",
    "buyer": "Comprador",
    "beneficiary": "Beneficiario",
    "name": "Nombre",
    "email": "Email",
    "phone": "Teléfono",
    "notes": "Notas (opcional)",
    "notes_placeholder": "Escribe aquí si quieres comentarnos cualquier cosa",
    "sessions": "sesiones",
    "total": "Total",
    "confirm_purchase": "Confirmar compra",
    "proceed_payment": "Proceder al Pago",
    "secure_payment_info": "Se abrirá una nueva ventana segura para completar tu compra. El bono se enviará automáticamente por email al comprador y beneficiario.",
    "email_buyer": "Email al comprador",
    "email_beneficiary": "Email al beneficiario",
    "email_center": "Notificación al centro",
    "open_secure_payment": "Abrir Página de Pago Seguro",
    
    // Gift Cards Page
    "gift_cards_page": "Tarjetas Regalo",
    "gift_cards_subtitle": "Elige tu tarjeta regalo. Diseño elegante y 100% responsive.",
    "cart": "Carrito",
    "your_cart": "Tu carrito",
    "cart_empty": "Tu carrito está vacío.",
    "remove": "Quitar",
    "empty_cart": "Vaciar",
    "proceed_to_payment": "Proceder al Pago",
    "custom_amount": "Importe Personalizado",
    "custom_gift_card": "TARJETA REGALO por VALOR personalizado",
    "custom_description": "Elige un importe fijo o escribe otro importe.",
    "custom_placeholder": "Introduce el importe personalizado",
    "valid_amount": "Indica un importe válido",
    "add_to_cart": "Añadir al Carrito",
    "added_to_cart": "Añadido al carrito",
    
    // Validation messages
    "select_voucher_error": "Selecciona un bono",
    "buyer_data_required": "Datos del comprador requeridos",
    "beneficiary_data_required": "Datos del beneficiario requeridos",
    "error": "Error",
    "payment_init_error": "No se pudo iniciar el pago",
    
    // Client Reservation Page
    "loading_centers": "Cargando centros...",
    "personal_information": "Información Personal",
    "full_name": "Nombre Completo",
    "full_name_placeholder": "Nombre y apellidos",
    "phone_placeholder": "+34 600 000 000",
    "email_placeholder": "cliente@email.com",
    "email_help": "Introduce tu email o teléfono para ver tus reservas anteriores y bonos",
    "your_bookings_vouchers": "Tus Reservas y Bonos",
    "sessions_remaining": "sesiones restantes",
    "expires": "Vence",
    "center_selection": "Selección de Centro",
    "center": "Centro",
    "select_center": "Selecciona un centro",
    "service_selection": "Selección de Servicio",
    "service": "Servicio",
    "loading_options": "Cargando opciones...",
    "date_time": "Fecha y Hora",
    "date": "Fecha",
    "select_date": "Selecciona una fecha",
    "time": "Hora",
    "select_time": "Selecciona una hora",
    "additional_notes": "Notas Adicionales",
    "notes_placeholder_form": "Cualquier información adicional que consideres importante...",
    "booking_summary": "Resumen de la Reserva",
    "admin_assignment": "El administrador asignará el especialista y tipo de servicio cuando llegues al centro.",
    "confirm_booking": "Confirmar Reserva",
    "select_service_error": "Selecciona un servicio",
    "complete_required_fields": "Por favor completa todos los campos obligatorios",
    "booking_created": "✅ Reserva Creada",
    "booking_confirmed": "confirmada exitosamente. ID:",
    "booking_error": "No se pudo crear la reserva. Inténtalo de nuevo.",
    "booking_cancelled": "Reserva Cancelada",
    "booking_cancelled_success": "La reserva ha sido cancelada exitosamente.",
    "cancel_booking_error": "No se pudo cancelar la reserva.",
    "client_found": "Cliente encontrado",
    "client_data_loaded": "Datos del cliente cargados automáticamente",
    
    // Landing page widgets
    "book_description": "Reserva tu cita de masaje relajante",
    "vouchers": "Bonos",
    "vouchers_description": "Compra paquetes de sesiones con descuento",
    "gift_description": "Regala experiencias de bienestar únicas",
    "our_locations": "Nuestras Ubicaciones",
    "locations_subtitle": "Encuéntranos en Madrid",
    "open_maps": "Abrir en Mapas",
  },
  
  en: {
    // Header
    "admin": "Admin",
    "back": "Back",
    
    // Landing Page
    "wellness_center": "Wellness Center",
    "landing_subtitle": "Discover the perfect harmony between relaxation and wellness in our exclusive massage center",
    "book_appointment": "Book Appointment",
    "gift_cards": "Gift Cards",
    "our_services": "Our Services",
    "services_subtitle": "We offer a wide range of treatments designed for your wellness",
    "individual_massages": "Individual Massages",
    "individual_description": "Personalized treatments for your personal wellness",
    "couples_massages": "Couples Massages",
    "couples_description": "Special moments to share as a couple",
    "special_rituals": "Special Rituals",
    "rituals_description": "Unique experiences for deep relaxation",
    "contact_us": "Contact Us",
    "contact_subtitle": "We're here to help you find your moment of wellness",
    "location": "Location",
    "location_description": "Find our wellness center in the heart of Madrid",
    "view_maps": "View on Maps",
    "hours": "Hours",
    "book_now": "Book Now",
    "rights_reserved": "All rights reserved",
    
    // Massage Types
    "relaxing_massage": "Relaxing Massage",
    "therapeutic_massage": "Therapeutic Massage",
    "foot_reflexology": "Foot Reflexology",
    "sports_massage": "Sports Massage",
    "couples_massage": "Couples Massage",
    "romantic_ritual": "Romantic Ritual",
    "hot_stones": "Hot Stone Massage",
    "bamboo_therapy": "Bamboo Therapy",
    "kobido_ritual": "Kobido Ritual",
    "sakura_ritual": "Sakura Ritual",
    "energizing_ritual": "Energizing Ritual",
    "beauty_ritual": "Beauty Ritual",
    
    // Buy Voucher Page
    "buy_voucher": "Buy Voucher",
    "voucher_subtitle": "Choose the voucher and complete the beneficiary details",
    "voucher": "Voucher",
    "select_voucher": "Select a voucher",
    "four_hands_massages": "Four Hands Massages",
    "rituals": "Rituals",
    "for_two_people": "Vouchers for Two People",
    "no_individual_vouchers": "No individual vouchers available",
    "no_four_hands_vouchers": "No four hands vouchers available",
    "no_ritual_vouchers": "No ritual vouchers available",
    "no_two_people_vouchers": "No vouchers for two available",
    "who_for": "Who is it for?",
    "for_me": "For me",
    "its_gift": "It's a gift",
    "buyer": "Buyer",
    "beneficiary": "Beneficiary",
    "name": "Name",
    "email": "Email",
    "phone": "Phone",
    "notes": "Notes (optional)",
    "notes_placeholder": "Write here if you want to tell us anything",
    "sessions": "sessions",
    "total": "Total",
    "confirm_purchase": "Confirm purchase",
    "proceed_payment": "Proceed to Payment",
    "secure_payment_info": "A secure window will open to complete your purchase. The voucher will be automatically sent by email to the buyer and beneficiary.",
    "email_buyer": "Email to buyer",
    "email_beneficiary": "Email to beneficiary",
    "email_center": "Notification to center",
    "open_secure_payment": "Open Secure Payment Page",
    
    // Gift Cards Page
    "gift_cards_page": "Gift Cards",
    "gift_cards_subtitle": "Choose your gift card. Elegant and 100% responsive design.",
    "cart": "Cart",
    "your_cart": "Your cart",
    "cart_empty": "Your cart is empty.",
    "remove": "Remove",
    "empty_cart": "Empty",
    "proceed_to_payment": "Proceed to Payment",
    "custom_amount": "Custom Amount",
    "custom_gift_card": "CUSTOM AMOUNT GIFT CARD",
    "custom_description": "Choose a fixed amount or enter another amount.",
    "custom_placeholder": "Enter custom amount",
    "valid_amount": "Please enter a valid amount",
    "add_to_cart": "Add to Cart",
    "added_to_cart": "Added to cart",
    
    // Validation messages
    "select_voucher_error": "Select a voucher",
    "buyer_data_required": "Buyer data required",
    "beneficiary_data_required": "Beneficiary data required",
    "error": "Error",
    "payment_init_error": "Could not initiate payment",
    
    // Client Reservation Page  
    "loading_centers": "Loading centers...",
    "personal_information": "Personal Information",
    "full_name": "Full Name",
    "full_name_placeholder": "First and Last Name",
    "phone_placeholder": "+34 600 000 000",
    "email_placeholder": "client@email.com",
    "email_help": "Enter your email or phone to see your previous bookings and vouchers",
    "your_bookings_vouchers": "Your Bookings and Vouchers",
    "sessions_remaining": "sessions remaining",
    "expires": "Expires",
    "center_selection": "Center Selection",
    "center": "Center",
    "select_center": "Select a center",
    "service_selection": "Service Selection",
    "service": "Service",
    "loading_options": "Loading options...",
    "date_time": "Date and Time",
    "date": "Date",
    "select_date": "Select a date",
    "time": "Time",
    "select_time": "Select a time",
    "additional_notes": "Additional Notes",
    "notes_placeholder_form": "Any additional information you consider important...",
    "booking_summary": "Booking Summary",
    "admin_assignment": "The administrator will assign the specialist and service type when you arrive at the center.",
    "confirm_booking": "Confirm Booking",
    "select_service_error": "Select a service",
    "complete_required_fields": "Please complete all required fields",
    "booking_created": "✅ Booking Created",
    "booking_confirmed": "confirmed successfully. ID:",
    "booking_error": "Could not create booking. Try again.",
    "booking_cancelled": "Booking Cancelled",
    "booking_cancelled_success": "The booking has been cancelled successfully.",
    "cancel_booking_error": "Could not cancel booking.",
    "client_found": "Client found",
    "client_data_loaded": "Client data loaded automatically",
    
    // Landing page widgets
    "book_description": "Book your relaxing massage appointment",
    "vouchers": "Vouchers",
    "vouchers_description": "Buy session packages with discount",
    "gift_description": "Give unique wellness experiences",
    "our_locations": "Our Locations",
    "locations_subtitle": "Find us in Madrid",
    "open_maps": "Open in Maps",
  },
  
  fr: {
    // Header
    "admin": "Admin",
    "back": "Retour",
    
    // Landing Page
    "wellness_center": "Centre de Bien-être",
    "landing_subtitle": "Découvrez l'harmonie parfaite entre relaxation et bien-être dans notre centre de massage exclusif",
    "book_appointment": "Prendre Rendez-vous",
    "gift_cards": "Cartes Cadeaux",
    "our_services": "Nos Services",
    "services_subtitle": "Nous proposons une large gamme de soins conçus pour votre bien-être",
    "individual_massages": "Massages Individuels",
    "individual_description": "Soins personnalisés pour votre bien-être personnel",
    "couples_massages": "Massages en Couple",
    "couples_description": "Moments spéciaux à partager en couple",
    "special_rituals": "Rituels Spéciaux",
    "rituals_description": "Expériences uniques pour une relaxation profonde",
    "contact_us": "Contactez-nous",
    "contact_subtitle": "Nous sommes là pour vous aider à trouver votre moment de bien-être",
    "location": "Localisation",
    "location_description": "Trouvez notre centre de bien-être au cœur de Madrid",
    "view_maps": "Voir sur Maps",
    "hours": "Horaires",
    "book_now": "Réserver Maintenant",
    "rights_reserved": "Tous droits réservés",
    
    // Buy Voucher Page
    "buy_voucher": "Acheter Bon",
    "voucher_subtitle": "Choisissez le bon et complétez les données du bénéficiaire",
    "voucher": "Bon",
    "select_voucher": "Sélectionnez un bon",
    "four_hands_massages": "Massages à Quatre Mains",
    "rituals": "Rituels",
    "for_two_people": "Bons pour Deux Personnes",
    "who_for": "Pour qui est-ce ?",
    "for_me": "Pour moi",
    "its_gift": "C'est un cadeau",
    "buyer": "Acheteur",
    "beneficiary": "Bénéficiaire",
    "name": "Nom",
    "email": "Email",
    "phone": "Téléphone",
    "notes": "Notes (optionnel)",
    "notes_placeholder": "Écrivez ici si vous voulez nous dire quelque chose",
    "sessions": "séances",
    "total": "Total",
    "confirm_purchase": "Confirmer l'achat",
    
    // Gift Cards Page
    "gift_cards_page": "Cartes Cadeaux",
    "gift_cards_subtitle": "Choisissez votre carte cadeau. Design élégant et 100% responsive.",
    "cart": "Panier",
    "your_cart": "Votre panier",
    "cart_empty": "Votre panier est vide.",
    "add_to_cart": "Ajouter au Panier",
    "added_to_cart": "Ajouté au panier",
    
    // Landing page widgets
    "book_description": "Réservez votre rendez-vous de massage relaxant",
    "vouchers": "Bons",
    "vouchers_description": "Achetez des forfaits de séances avec remise",
    "gift_description": "Offrez des expériences de bien-être uniques",
    "our_locations": "Nos Emplacements",
    "locations_subtitle": "Trouvez-nous à Madrid",
    "open_maps": "Ouvrir dans Maps",
  },
  
  de: {
    // Header
    "admin": "Admin",
    "back": "Zurück",
    
    // Landing Page
    "wellness_center": "Wellness-Zentrum",
    "landing_subtitle": "Entdecken Sie die perfekte Harmonie zwischen Entspannung und Wohlbefinden in unserem exklusiven Massagezentrum",
    "book_appointment": "Termin Buchen",
    "gift_cards": "Geschenkkarten",
    "our_services": "Unsere Dienstleistungen",
    "services_subtitle": "Wir bieten eine breite Palette von Behandlungen für Ihr Wohlbefinden",
    "individual_massages": "Einzelmassagen",
    "individual_description": "Personalisierte Behandlungen für Ihr persönliches Wohlbefinden",
    "couples_massages": "Paarmassagen",
    "couples_description": "Besondere Momente zu zweit",
    "special_rituals": "Besondere Rituale",
    "rituals_description": "Einzigartige Erfahrungen für tiefe Entspannung",
    "contact_us": "Kontaktieren Sie uns",
    "contact_subtitle": "Wir sind hier, um Ihnen zu helfen, Ihren Moment des Wohlbefindens zu finden",
    "location": "Standort",
    "location_description": "Finden Sie unser Wellness-Zentrum im Herzen von Madrid",
    "view_maps": "Auf Maps anzeigen",
    "hours": "Öffnungszeiten",
    "book_now": "Jetzt Buchen",
    "rights_reserved": "Alle Rechte vorbehalten",
    
    // Buy Voucher Page
    "buy_voucher": "Gutschein Kaufen",
    "voucher": "Gutschein",
    "select_voucher": "Wählen Sie einen Gutschein",
    "four_hands_massages": "Vier-Hände-Massagen",
    "rituals": "Rituale",
    "for_two_people": "Gutscheine für Zwei Personen",
    "who_for": "Für wen ist es?",
    "for_me": "Für mich",
    "its_gift": "Es ist ein Geschenk",
    "buyer": "Käufer",
    "beneficiary": "Begünstigter",
    "name": "Name",
    "email": "Email",
    "phone": "Telefon",
    "confirm_purchase": "Kauf bestätigen",
    
    // Gift Cards Page
    "gift_cards_page": "Geschenkkarten",
    "cart": "Warenkorb",
    "add_to_cart": "In den Warenkorb",
    "added_to_cart": "Zum Warenkorb hinzugefügt",
    
    // Landing page widgets
    "book_description": "Buchen Sie Ihren entspannenden Massage-Termin",
    "vouchers": "Gutscheine",
    "vouchers_description": "Kaufen Sie Sitzungspakete mit Rabatt",
    "gift_description": "Schenken Sie einzigartige Wellness-Erlebnisse",
    "our_locations": "Unsere Standorte",
    "locations_subtitle": "Finden Sie uns in Madrid",
    "open_maps": "In Maps öffnen",
  },
  
  it: {
    // Header
    "admin": "Admin",
    "back": "Indietro",
    
    // Landing Page
    "wellness_center": "Centro Benessere",
    "landing_subtitle": "Scopri l'armonia perfetta tra relax e benessere nel nostro esclusivo centro massaggi",
    "book_appointment": "Prenota Appuntamento",
    "gift_cards": "Carte Regalo",
    "our_services": "I Nostri Servizi",
    "services_subtitle": "Offriamo una vasta gamma di trattamenti pensati per il vostro benessere",
    "individual_massages": "Massaggi Individuali",
    "individual_description": "Trattamenti personalizzati per il vostro benessere personale",
    "couples_massages": "Massaggi di Coppia",
    "couples_description": "Momenti speciali da condividere in coppia",
    "special_rituals": "Rituali Speciali",
    "rituals_description": "Esperienze uniche per un relax profondo",
    "contact_us": "Contattaci",
    "contact_subtitle": "Siamo qui per aiutarvi a trovare il vostro momento di benessere",
    "location": "Posizione",
    "location_description": "Trova il nostro centro benessere nel cuore di Madrid",
    "view_maps": "Visualizza su Maps",
    "hours": "Orari",
    "book_now": "Prenota Ora",
    "rights_reserved": "Tutti i diritti riservati",
    
    // Buy Voucher Page
    "buy_voucher": "Acquista Buono",
    "voucher": "Buono",
    "select_voucher": "Seleziona un buono",
    "four_hands_massages": "Massaggi a Quattro Mani",
    "rituals": "Rituali",
    "for_two_people": "Buoni per Due Persone",
    "who_for": "Per chi è?",
    "for_me": "Per me",
    "its_gift": "È un regalo",
    "buyer": "Acquirente",
    "beneficiary": "Beneficiario",
    "name": "Nome",
    "email": "Email",
    "phone": "Telefono",
    "confirm_purchase": "Conferma acquisto",
    
    // Gift Cards Page
    "gift_cards_page": "Carte Regalo",
    "cart": "Carrello",
    "add_to_cart": "Aggiungi al Carrello",
    "added_to_cart": "Aggiunto al carrello",
    
    // Landing page widgets
    "book_description": "Prenota il tuo appuntamento per massaggio rilassante",
    "vouchers": "Buoni",
    "vouchers_description": "Acquista pacchetti di sessioni con sconto",
    "gift_description": "Regala esperienze di benessere uniche",
    "our_locations": "Le Nostre Sedi",
    "locations_subtitle": "Trovaci a Madrid",
    "open_maps": "Apri in Maps",
  },
  
  pt: {
    // Header
    "admin": "Admin",
    "back": "Voltar",
    
    // Landing Page
    "wellness_center": "Centro de Bem-estar",
    "landing_subtitle": "Descubra a harmonia perfeita entre relaxamento e bem-estar no nosso centro de massagens exclusivo",
    "book_appointment": "Marcar Consulta",
    "gift_cards": "Cartões Presente",
    "our_services": "Os Nossos Serviços",
    "services_subtitle": "Oferecemos uma vasta gama de tratamentos pensados para o seu bem-estar",
    "individual_massages": "Massagens Individuais",
    "individual_description": "Tratamentos personalizados para o seu bem-estar pessoal",
    "couples_massages": "Massagens para Casais",
    "couples_description": "Momentos especiais para partilhar em casal",
    "special_rituals": "Rituais Especiais",
    "rituals_description": "Experiências únicas para um relaxamento profundo",
    "contact_us": "Contacte-nos",
    "contact_subtitle": "Estamos aqui para o ajudar a encontrar o seu momento de bem-estar",
    "location": "Localização",
    "location_description": "Encontre o nosso centro de bem-estar no coração de Madrid",
    "view_maps": "Ver no Maps",
    "hours": "Horários",
    "book_now": "Reservar Agora",
    "rights_reserved": "Todos os direitos reservados",
    
    // Buy Voucher Page
    "buy_voucher": "Comprar Voucher",
    "voucher": "Voucher",
    "select_voucher": "Selecione um voucher",
    "four_hands_massages": "Massagens a Quatro Mãos",
    "rituals": "Rituais",
    "for_two_people": "Vouchers para Duas Pessoas",
    "who_for": "Para quem é?",
    "for_me": "Para mim",
    "its_gift": "É um presente",
    "buyer": "Comprador",
    "beneficiary": "Beneficiário",
    "name": "Nome",
    "email": "Email",
    "phone": "Telefone",
    "confirm_purchase": "Confirmar compra",
    
    // Gift Cards Page
    "gift_cards_page": "Cartões Presente",
    "cart": "Carrinho",
    "add_to_cart": "Adicionar ao Carrinho",
    "added_to_cart": "Adicionado ao carrinho",
    
    // Landing page widgets
    "book_description": "Reserve a sua consulta de massagem relaxante",
    "vouchers": "Vouchers",
    "vouchers_description": "Compre pacotes de sessões com desconto",
    "gift_description": "Ofereça experiências de bem-estar únicas",
    "our_locations": "As Nossas Localizações",
    "locations_subtitle": "Encontre-nos em Madrid",
    "open_maps": "Abrir no Maps",
  }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations['es'];

// Create context
export const TranslationContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}>({
  language: 'es',
  setLanguage: () => {},
  t: (key) => key,
});

// Custom hook to use translations
export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Hook implementation for when used outside context
export const useTranslationHook = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'es';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] || translations.es[key] || key;
  };

  return { language, setLanguage, t };
};