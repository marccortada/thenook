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
    "rituals": "Rituales Individuales",
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
    "secure_payment_info": "",
    "email_buyer": "Email al comprador",
    "email_beneficiary": "Email al beneficiario",
    "email_center": "Notificación al centro",
    "open_secure_payment": "Abrir Página de Pago Seguro",
    "method_card": "Tarjeta",
    "secure_payment_with_stripe": "Pago 100% seguro procesado por Stripe",
    
    // Gift Cards Page
    "gift_cards_page": "Tarjetas Regalo",
    "gift_cards_subtitle": "Elige tu tarjeta regalo. Diseño elegante y 100% responsive.",
    "gift_card_group_individual": "Tarjeta Regalo - Masaje Individual",
    "gift_card_group_couples": "Tarjeta Regalo - Masaje para Dos",
    "gift_card_group_four_hands": "Tarjeta Regalo - Masaje a Cuatro Manos",
    "gift_card_group_individual_rituals": "Tarjeta Regalo - Rituales Individuales",
    "gift_card_group_couples_rituals": "Tarjeta Regalo - Rituales para Dos",
    "gift_card_group_multi_sessions": "Tarjeta Regalo - Bonos varias sesiones",
    "rituals_for_two": "Rituales para Dos",
    "custom_gift_card_title": "Tarjeta Regalo Personalizada",
    "choose_amount_for": "Elige el valor que prefieras para",
    "customize": "Personalizar",
    "other_value_label": "Otro valor (€)",
    "add": "Añadir",
    "value_min_max_note": "Valor mínimo: 10€",
    "customize_gift_card_title": "Personalizar Tarjeta Regalo",
    "customize_gift_card_description_prefix": "Selecciona el valor de tu tarjeta regalo para",
    "cart": "Carrito",
    "your_cart": "Tu carrito",
     "cart_empty": "Tu carrito está vacío.",
     "empty_cart": "Vaciar",
    "proceed_to_payment": "Proceder al Pago",
    "custom_amount": "Importe Personalizado",
    "custom_gift_card": "TARJETA REGALO por VALOR personalizado",
     "custom_description": "Elige un importe fijo o escribe otro importe.",
     "custom_placeholder": "Otro importe (€)",
     "valid_amount": "Indica un importe válido",
     "add_to_cart": "Añadir al Carrito",
     "added_to_cart": "Añadido al carrito",
    
    // Validation messages
    "select_voucher_error": "Selecciona un bono",
    "buyer_data_required": "Datos del comprador requeridos",
    "beneficiary_data_required": "Datos del beneficiario requeridos",
    "error": "Error",
     "payment_init_error": "No se pudo iniciar el pago",
     
     // Error messages
     "recipient_name_error": "Por favor, indica el nombre del beneficiario",
     "buyer_name_error": "Por favor, indica tu nombre", 
     "buyer_email_error": "Por favor, indica tu email",
     "purchase_success": "¡Compra procesada exitosamente!",
     "purchase_error": "Error al procesar la compra. Inténtalo de nuevo.",
     "buy_button": "Comprar",
    
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
    "processing_booking": "Procesando tu reserva...",
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
    "vouchers_description": "Compra varias sesiones con descuento",
    "gift_description": "Regala experiencias de bienestar únicas",
     "our_locations": "Nuestras Ubicaciones",
     "locations_subtitle": "Encuéntranos en Madrid",
     "open_maps": "Abrir en Mapas",
     
     // Package/Voucher related
     "massage_vouchers": "Bonos de Masaje",
     "save_buying_session_packages": "Ahorra comprando paquetes de sesiones con descuento",
     
     // Manage Booking
     "enter_email_or_phone": "Por favor introduce tu email o teléfono",
     
     // Form labels
     "name_label": "Nombre",
     "close": "Cerrar",
     
     // Package page specific
     "remove": "Quitar",
     "purchased_by_name": "Comprado por (nombre)",
     "buyer_name_placeholder": "Nombre del comprador",
     "buyer_email": "Email del comprador",
     "buyer_email_placeholder": "email@ejemplo.com",
     "is_gift": "¿Es un regalo?",
     "recipient_name_required": "Para (nombre del beneficiario) *",
     "recipient_name_placeholder": "Nombre del beneficiario",
     "recipient_email": "Email del beneficiario",
     "gift_message": "Mensaje de regalo (opcional)",
     "gift_message_placeholder": "Tu mensaje personalizado...",
     "empty_cart_button": "Vaciar",
     "individual_massages_packages": "Bonos para Masaje Individual",
      "four_hands_packages": "Bonos para Masaje a Cuatro Manos",
      "rituals_packages": "Bonos para Rituales Individuales",
      "couples_packages": "Bonos para Masaje para Dos",
     "sessions_count": "sesiones",
     
     // Package names translations
     "bono_5_masajes_piernas_cansadas": "Bono 5 masajes Piernas Cansadas",
     "bono_5_masajes_55": "Bono 5 masajes 55'",
     "bono_5_sesiones_shiatsu": "Bono 5 sesiones de Shiatsu",
     "bono_5_masajes_relajante": "Bono 5 masajes Relajante",
     "bono_5_masajes_descontracturante": "Bono 5 masajes Descontracturante",
     "bono_5_masajes_75_minutos": "Bono 5 masajes 75 minutos",
     "bono_10_masajes_55": "Bono 10 masajes 55'",
     "bono_10_masajes_75": "Bono 10 masajes 75'",
     
     // Gift card individual services
     "piernas_cansadas": "Piernas Cansadas",
     "masaje_descontracturante_55_minutos": "Masaje Descontracturante 55 minutos",
     "reflexologia_podal": "Reflexología Podal",
     "shiatsu": "Shiatsu",
     "masaje_para_embarazada_50_minutos": "Masaje para Embarazada 50 minutos",
     "masaje_relajante_55_minutos": "Masaje Relajante 55 minutos",
     "masaje_deportivo_50_minutos": "Masaje Deportivo 50 minutos",
     "masaje_con_piedras_calientes": "Masaje con Piedras Calientes",
     "bambuterapia_masaje_con_canas_de_bambu": "Bambuterapia Masaje con Cañas de Bambú",
     "ritual_romantico_individual": "Ritual Romántico Individual",
     "ritual_energizante_individual": "Ritual Energizante Individual",
     "drenaje_linfatico_75_minutos": "Drenaje Linfático 75 minutos",
     "antiestres_the_nook": "Antiestrés The Nook",
     "masaje_para_embarazada_75_minutos": "Masaje para Embarazada 75 minutos",
     "masaje_descontracturante_75_minutos": "Masaje Descontracturante 75 minutos",
     "tarjeta_regalo_por_valor_personalizado": "TARJETA REGALO por VALOR personalizado",
     
     // Gift card configuration
     "gift_card_config": "Configuración de la Tarjeta",
     "show_price_on_card": "¿Mostrar precio en la tarjeta?",
     "who_to_send_card": "¿A quién enviar la tarjeta?",
     "send_to_buyer": "Enviar al comprador",
     "send_to_recipient": "Enviar directamente al beneficiario",
     "show_buyer_data": "¿Mostrar datos del comprador?",
     "complete_payment": "Completar Pago",
     
     // Common actions (new ones not duplicated)
     "cancel": "Cancelar",
     "save": "Guardar", 
     "search": "Buscar",
     "loading": "Cargando",
     "no_results": "No hay resultados",
     "select": "Seleccionar",
     "confirm": "Confirmar",
     
      // Form fields (new ones not duplicated)
      "description": "Descripción",
      "price": "Precio",
      "status": "Estado",
      "active": "Activo",
      "inactive": "Inactivo",
      
      
      // Admin and management
     "administration": "Administración",
     "management": "Gestión",
     "configuration": "Configuración",
     "dashboard": "Panel de Control",
     "appointments": "Citas",
     
     // Page specific texts
     "voucher_page_title": "Bonos",
     "voucher_page_description": "Elige tu bono de sesiones. Perfecto para regalos o uso personal.",
     "create_new_package": "Crear Nuevo Paquete",
     "package_name": "Nombre del paquete",
     "package_description": "Descripción del paquete",
     "select_service": "Seleccionar servicio",
     "create_package": "Crear Paquete",
     "total_packages": "Total Paquetes",
     "active_packages": "Paquetes Activos",
     "all_packages": "Todos los Paquetes",
     "inactive_packages": "Paquetes Inactivos",
     
     // Additional missing translations
     "existing_bookings": "Reservas Existentes",
     "processing": "Procesando...",
     "continue": "Continuar",
     "no_availability": "Sin disponibilidad",
     "no_availability_message": "No hay carriles disponibles para este servicio en el horario seleccionado. Por favor, elige otra hora.",
     "full_capacity": "Capacidad Completa",
     "full_capacity_message": "Esta franja horaria ya tiene el máximo de 4 reservas. Por favor, elige otro horario.",
     "address": "Dirección",
     "copyright": "© THE NOOK Madrid 2025 · Todos los derechos reservados",
     "redirecting_to_stripe": "Redirigiendo a Stripe...",
     "package_not_found": "No se encontró el bono seleccionado. Actualiza la página e inténtalo nuevamente.",
     "individual_massages_label": "🧘 Masajes Individuales",
     "four_hands_massages_label": "✋ Masajes a Cuatro Manos",
     "rituals_label": "🌸 Rituales",
     "for_two_people_label": "💑 Para Dos Personas",
     "no_lanes_available": "Sin carriles disponibles",
     "past_time": "Horario pasado",
     "no_availability_simple": "Sin disponibilidad",
     "chamberi_zurbaran": "Chamberí - Zurbarán",
     "chamartin_concha_espina": "Chamartín - Concha Espina",
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
    "secure_payment_info": "",
    "email_buyer": "Email to buyer",
    "email_beneficiary": "Email to beneficiary",
    "email_center": "Notification to center",
    "open_secure_payment": "Open Secure Payment Page",
    "method_card": "Card",
    "secure_payment_with_stripe": "100% secure payment processed by Stripe",
    
    // Gift Cards Page
    "gift_cards_page": "Gift Cards",
    "gift_cards_subtitle": "Choose your gift card. Elegant and 100% responsive design.",
    "gift_card_group_individual": "Gift Card - Individual Massage",
    "gift_card_group_couples": "Gift Card - Couples Massage",
    "gift_card_group_four_hands": "Gift Card - Four Hands Massage",
    "gift_card_group_individual_rituals": "Gift Card - Individual Rituals",
    "gift_card_group_couples_rituals": "Gift Card - Rituals for Two",
    "gift_card_group_multi_sessions": "Gift Card - Multi-session Packs",
    "rituals_for_two": "Rituals for Two",
    "custom_gift_card_title": "Custom Gift Card",
    "choose_amount_for": "Choose the amount for",
    "customize": "Customize",
    "other_value_label": "Other amount (€)",
    "add": "Add",
    "value_min_max_note": "Minimum: €10 - Maximum: €500",
    // (deduped keys removed)
    
    // Validation messages
    "select_voucher_error": "Select a voucher",
    "buyer_data_required": "Buyer data required",
    "beneficiary_data_required": "Beneficiary data required",
    "error": "Error",
     "payment_init_error": "Could not initiate payment",
     
     // Error messages
     "recipient_name_error": "Please enter the recipient's name",
     "buyer_name_error": "Please enter your name", 
     "buyer_email_error": "Please enter your email",
     "purchase_success": "Purchase processed successfully!",
     "purchase_error": "Error processing purchase. Please try again.",
     "buy_button": "Buy",
    
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
     "processing_booking": "Processing your booking...",
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
     
     // Package/Voucher related
     "massage_vouchers": "Massage Vouchers",
     "save_buying_session_packages": "Save by buying session packages with discount",
     
     // Manage Booking
     "enter_email_or_phone": "Please enter your email or phone",
     
     // Form labels
     "name_label": "Name",
     "close": "Close",
     
     // Package page specific
     "remove": "Remove",
     "purchased_by_name": "Purchased by (name)",
     "buyer_name_placeholder": "Buyer's name",
     "buyer_email": "Buyer's email",
     "buyer_email_placeholder": "email@example.com",
     "is_gift": "Is it a gift?",
     "recipient_name_required": "For (recipient's name) *",
     "recipient_name_placeholder": "Recipient's name",
     "recipient_email": "Recipient's email",
     "gift_message": "Gift message (optional)",
     "gift_message_placeholder": "Your personalized message...",
     "empty_cart_button": "Empty",
      "individual_massages_packages": "Individual Massage Gift Cards",
      "four_hands_packages": "Four Hands Massage Gift Cards",
      "rituals_packages": "Ritual Gift Cards",
      "couples_packages": "Couples Massage Gift Cards",
     "sessions_count": "sessions",
     
     // Package names translations
     "bono_5_masajes_piernas_cansadas": "5 Tired Legs Massage Package",
     "bono_5_masajes_55": "5 Massage Package 55'",
     "bono_5_sesiones_shiatsu": "5 Shiatsu Sessions Package",
     "bono_5_masajes_relajante": "5 Relaxing Massage Package",
     "bono_5_masajes_descontracturante": "5 Therapeutic Massage Package",
     "bono_5_masajes_75_minutos": "5 75-Minute Massage Package",
     "bono_5_masajes_dos_personas_45_minutos": "5 45-Minute Couples Massage Package",
     "bono_10_masajes_55_minutos": "10 55-Minute Massage Package",
     "bono_10_masajes_reductor_anticelulitico": "10 Anti-Cellulite Massage Package",
     "bono_10_masajes_para_embarazada": "10 Pregnancy Massage Package",
     "bono_5_masajes_dos_personas_75_minutos": "5 75-Minute Couples Massage Package",
     "bono_5_masajes_para_embarazada": "5 Pregnancy Massage Package",
     "bono_5_masajes_reductor_anticelulitico": "5 Anti-Cellulite Massage Package",
     "bono_5_masajes_55_minutos": "5 55-Minute Massage Package",
     
     // Individual gift card translations
     "piernas_cansadas": "Tired Legs Massage",
     "masaje_descontracturante_55_minutos": "55-Minute Therapeutic Massage",
     "reflexologia_podal": "Foot Reflexology",
     "shiatsu": "Shiatsu",
     "masaje_para_embarazada_50_minutos": "50-Minute Pregnancy Massage",
     "masaje_relajante_55_minutos": "55-Minute Relaxing Massage",
     "masaje_deportivo_50_minutos": "50-Minute Sports Massage",
     "masaje_con_piedras_calientes": "Hot Stone Massage",
     "bambuterapia_masaje_con_canas_de_bambu": "Bamboo Cane Massage Therapy",
     "ritual_romantico_individual": "Individual Romantic Ritual",
     "ritual_energizante_individual": "Individual Energizing Ritual",
     "drenaje_linfatico_75_minutos": "75-Minute Lymphatic Drainage",
     "antiestres_the_nook": "The Nook Anti-Stress",
     "masaje_para_embarazada_75_minutos": "75-Minute Pregnancy Massage",
     "masaje_descontracturante_75_minutos": "75-Minute Therapeutic Massage",
     "masaje_dos_personas_45_minutos": "45-Minute Couples Massage",
     "ritual_del_kobido_individual": "Individual Kobido Ritual",
     "masaje_90_minutos": "90-Minute Massage",
     "ritual_sakura_individual": "Individual Sakura Ritual",
     "masaje_dos_personas_55_minutos": "55-Minute Couples Massage",
     "masaje_a_cuatro_manos_50_minutos": "50-Minute Four Hands Massage",
     "masaje_relajante_extra_largo_110_minutos": "110-Minute Extra Long Relaxing Massage",
     "bambuterapia_masaje_con_canas_de_bambu_para_dos_personas": "Couples Bamboo Cane Massage Therapy",
     "masaje_con_piedras_calientes_para_dos_personas": "Couples Hot Stone Massage",
     "ritual_beauty_individual": "Individual Beauty Ritual",
     "ritual_energizante_para_dos_personas": "Couples Energizing Ritual",
     "ritual_romantico_para_dos_personas": "Couples Romantic Ritual",
     "masaje_dos_personas_75_minutos": "75-Minute Couples Massage",
     "masaje_a_cuatro_manos_80_minutos": "80-Minute Four Hands Massage",
     "ritual_del_kobido_para_dos_personas": "Couples Kobido Ritual",
     "masaje_dos_personas_110_minutos": "110-Minute Couples Massage",
     "ritual_sakura_para_dos_personas": "Couples Sakura Ritual",
     "ritual_beauty_para_dos_personas": "Couples Beauty Ritual",
     "tarjeta_regalo_por_valor_personalizado": "GIFT CARD for CUSTOM value",
     
     // Gift card configuration
     "gift_card_config": "Gift Card Configuration",
     "show_price_on_card": "Show price on card?",
     "who_to_send_card": "Who to send the card to?",
     "send_to_buyer": "Send to buyer",
     "send_to_recipient": "Send directly to recipient",
     "show_buyer_data": "Show buyer data?",
     "complete_payment": "Complete Payment",
     
     // Common actions
     "cancel": "Cancel",
     "save": "Save", 
     "search": "Search",
     "loading": "Loading",
     "no_results": "No results",
     "select": "Select",
     "confirm": "Confirm",
     
      // Form fields
      "description": "Description",
      "price": "Price",
      "status": "Status",
      "active": "Active",
      "inactive": "Inactive",
     
     // Admin and management
     "administration": "Administration",
     "management": "Management",
     "configuration": "Configuration",
     "dashboard": "Dashboard",
     "appointments": "Appointments",
     
     // Page specific texts
     "voucher_page_title": "Vouchers",
     "voucher_page_description": "Choose your session voucher. Perfect for gifts or personal use.",
     "create_new_package": "Create New Package",
     "package_name": "Package name",
     "package_description": "Package description",
     "select_service": "Select service",
     "create_package": "Create Package",
     "total_packages": "Total Packages",
     "active_packages": "Active Packages",
     "all_packages": "All Packages",
     "inactive_packages": "Inactive Packages",
     
     // Additional missing translations
     "existing_bookings": "Existing Bookings",
     "processing": "Processing...",
     "continue": "Continue",
     "no_availability": "No Availability",
     "no_availability_message": "No lanes available for this service at the selected time. Please choose another time.",
     "full_capacity": "Full Capacity",
     "full_capacity_message": "This time slot already has the maximum of 4 bookings. Please choose another time.",
     "address": "Address",
     "copyright": "© THE NOOK Madrid 2025 · All rights reserved",
     "redirecting_to_stripe": "Redirecting to Stripe...",
     "package_not_found": "Selected package not found. Please refresh the page and try again.",
     "individual_massages_label": "🧘 Individual Massages",
     "four_hands_massages_label": "✋ Four Hands Massages",
     "rituals_label": "🌸 Rituals",
     "for_two_people_label": "💑 For Two People",
     "no_lanes_available": "No lanes available",
     "past_time": "Past time",
     "no_availability_simple": "No availability",
     "chamberi_zurbaran": "Chamberí - Zurbarán",
     "chamartin_concha_espina": "Chamartín - Concha Espina",
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
     "add_to_cart": "Ajouter au Panier",
     "added_to_cart": "Ajouté au panier",
     "individual_massages_packages": "Cartes Cadeaux Massages Individuels",
     "couples_packages": "Cartes Cadeaux Massages en Couple",
     "four_hands_packages": "Cartes Cadeaux Massages à Quatre Mains",
     "rituals_packages": "Cartes Cadeaux Rituels",
    "custom_amount": "Montant Personnalisé",
    "gift_card_group_individual": "Carte Cadeau - Massage Individuel",
    "gift_card_group_couples": "Carte Cadeau - Massage en Couple",
    "gift_card_group_four_hands": "Carte Cadeau - Massage à Quatre Mains",
    "gift_card_group_individual_rituals": "Carte Cadeau - Rituels Individuels",
    "gift_card_group_couples_rituals": "Carte Cadeau - Rituels pour Deux",
    "gift_card_group_multi_sessions": "Carte Cadeau - Forfaits multi-séances",
    "rituals_for_two": "Rituels pour Deux",
    "custom_gift_card_title": "Carte Cadeau Personnalisée",
    "choose_amount_for": "Choisissez le montant pour",
    "customize": "Personnaliser",
    "other_value_label": "Autre montant (€)",
    "add": "Ajouter",
    "value_min_max_note": "Minimum : 10€ - Maximum : 500€",
     "customize_gift_card_title": "Personnaliser la Carte Cadeau",
     "customize_gift_card_description_prefix": "Sélectionnez le montant de la carte cadeau pour",
     
     // Additional missing translations
     "existing_bookings": "Réservations Existantes",
     "processing": "Traitement en cours...",
     "continue": "Continuer",
     "no_availability": "Pas de disponibilité",
     "no_availability_message": "Aucun couloir disponible pour ce service à l'heure sélectionnée. Veuillez choisir une autre heure.",
     "full_capacity": "Capacité Complète",
     "full_capacity_message": "Ce créneau horaire a déjà atteint le maximum de 4 réservations. Veuillez choisir un autre créneau.",
     "address": "Adresse",
     "copyright": "© THE NOOK Madrid 2025 · Tous droits réservés",
     "redirecting_to_stripe": "Redirection vers Stripe...",
     "package_not_found": "Le forfait sélectionné n'a pas été trouvé. Veuillez actualiser la page et réessayer.",
     "individual_massages_label": "🧘 Massages Individuels",
     "four_hands_massages_label": "✋ Massages à Quatre Mains",
     "rituals_label": "🌸 Rituels",
     "for_two_people_label": "💑 Pour Deux Personnes",
     "no_lanes_available": "Aucun couloir disponible",
     "past_time": "Heure passée",
     "no_availability_simple": "Pas de disponibilité",
     "chamberi_zurbaran": "Chamberí - Zurbarán",
     "chamartin_concha_espina": "Chamartín - Concha Espina",
    
    // Landing page widgets
    "book_description": "Réservez votre rendez-vous de massage relaxant",
    "vouchers": "Bons",
    "vouchers_description": "Achetez des forfaits de séances avec remise",
    "gift_description": "Offrez des expériences de bien-être uniques",
     "our_locations": "Nos Emplacements",
     "locations_subtitle": "Trouvez-nous à Madrid",
     "open_maps": "Ouvrir dans Maps",
     
     // Package/Voucher related
     "massage_vouchers": "Bons de Massage",
     "save_buying_session_packages": "Économisez en achetant des forfaits de séances avec remise",
     
     // Manage Booking
     "enter_email_or_phone": "Veuillez saisir votre email ou téléphone",
     
     // Form labels
     "name_label": "Nom",
     "close": "Fermer",
     
     // Package names translations (French)
     "bono_5_masajes_piernas_cansadas": "Forfait 5 massages Jambes Fatiguées",
     "bono_5_masajes_55": "Forfait 5 massages 55'",
     "bono_5_sesiones_shiatsu": "Forfait 5 séances de Shiatsu",
     "bono_5_masajes_relajante": "Forfait 5 massages Relaxants",
     "bono_5_masajes_descontracturante": "Forfait 5 massages Thérapeutiques",
     "bono_5_masajes_75_minutos": "Forfait 5 massages 75 minutes",
     "bono_10_masajes_55": "Forfait 10 massages 55'",
     "bono_10_masajes_75": "Forfait 10 massages 75'",
     "bono_5_masajes_dos_personas_45_minutos": "Forfait 5 massages couple 45 minutes",
     "bono_10_masajes_55_minutos": "Forfait 10 massages 55 minutes",
     "bono_10_masajes_reductor_anticelulitico": "Forfait 10 massages anti-cellulite",
     "bono_10_masajes_para_embarazada": "Forfait 10 massages prénataux",
     "bono_5_masajes_dos_personas_75_minutos": "Forfait 5 massages couple 75 minutes",
     "bono_5_masajes_para_embarazada": "Forfait 5 massages prénataux",
     "bono_5_masajes_reductor_anticelulitico": "Forfait 5 massages anti-cellulite",
     "bono_5_masajes_55_minutos": "Forfait 5 massages 55 minutes",
     "piernas_cansadas": "Jambes Fatiguées",
     "masaje_descontracturante_55_minutos": "Massage Thérapeutique 55 minutes",
     "reflexologia_podal": "Réflexologie Plantaire",
     "shiatsu": "Shiatsu",
     "masaje_para_embarazada_50_minutos": "Massage Prénatal 50 minutes",
     "masaje_relajante_55_minutos": "Massage Relaxant 55 minutes",
     "masaje_deportivo_50_minutos": "Massage Sportif 50 minutes",
     "masaje_con_piedras_calientes": "Massage aux Pierres Chaudes",
     "bambuterapia_masaje_con_canas_de_bambu": "Massage Bambou Thérapie",
     "ritual_romantico_individual": "Rituel Romantique Individuel",
     "ritual_energizante_individual": "Rituel Énergisant Individuel",
     "drenaje_linfatico_75_minutos": "Drainage Lymphatique 75 minutes",
     "antiestres_the_nook": "Anti-stress The Nook",
     "masaje_para_embarazada_75_minutos": "Massage Prénatal 75 minutes",
     "masaje_descontracturante_75_minutos": "Massage Thérapeutique 75 minutes",
     "masaje_dos_personas_45_minutos": "Massage couple 45 minutes",
     "ritual_del_kobido_individual": "Rituel Kobido individuel",
     "masaje_90_minutos": "Massage 90 minutes",
     "ritual_sakura_individual": "Rituel Sakura individuel",
     "masaje_dos_personas_55_minutos": "Massage couple 55 minutes",
     "masaje_a_cuatro_manos_50_minutos": "Massage à quatre mains 50 minutes",
     "masaje_relajante_extra_largo_110_minutos": "Massage relaxant extra long 110 minutes",
     "bambuterapia_masaje_con_canas_de_bambu_para_dos_personas": "Massage bambou thérapie pour deux",
     "masaje_con_piedras_calientes_para_dos_personas": "Massage pierres chaudes pour deux",
     "ritual_beauty_individual": "Rituel beauté individuel",
     "ritual_energizante_para_dos_personas": "Rituel énergisant pour deux",
     "ritual_romantico_para_dos_personas": "Rituel romantique pour deux",
     "masaje_dos_personas_75_minutos": "Massage couple 75 minutes",
     "masaje_a_cuatro_manos_80_minutos": "Massage à quatre mains 80 minutes",
     "ritual_del_kobido_para_dos_personas": "Rituel Kobido pour deux",
     "masaje_dos_personas_110_minutos": "Massage couple 110 minutes",
     "ritual_sakura_para_dos_personas": "Rituel Sakura pour deux",
     "ritual_beauty_para_dos_personas": "Rituel beauté pour deux",
     "tarjeta_regalo_por_valor_personalizado": "CARTE CADEAU pour VALEUR personnalisée",
     
     // Gift card configuration
     "gift_card_config": "Configuration de la Carte Cadeau",
     "show_price_on_card": "Afficher le prix sur la carte ?",
     "who_to_send_card": "À qui envoyer la carte ?",
     "send_to_buyer": "Envoyer à l'acheteur",
     "send_to_recipient": "Envoyer directement au bénéficiaire",
     "show_buyer_data": "Afficher les données de l'acheteur ?",
     "complete_payment": "Finaliser le Paiement",
     "buy_button": "Acheter",
     "custom_gift_card": "CARTE CADEAU pour VALEUR personnalisée",
     "custom_description": "Choisissez un montant fixe ou saisissez un autre montant.",
     "custom_placeholder": "Autre montant (€)",
     "valid_amount": "Veuillez indiquer un montant valide",
     "proceed_to_payment": "Procéder au Paiement",
     "cart_empty": "Votre panier est vide.",
     "remove": "Retirer",
     "purchased_by_name": "Acheté par (nom)",
     "buyer_name_placeholder": "Nom de l'acheteur",
     "buyer_email": "Email de l'acheteur",
     "buyer_email_placeholder": "email@exemple.com",
     "is_gift": "Est-ce un cadeau ?",
     "recipient_name_required": "Pour (nom du bénéficiaire) *",
     "recipient_name_placeholder": "Nom du bénéficiaire",
     "recipient_email": "Email du bénéficiaire",
     "gift_message": "Message cadeau (optionnel)",
     "gift_message_placeholder": "Votre message personnalisé...",
     "empty_cart_button": "Vider",
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
     
     // Package/Voucher related
     "massage_vouchers": "Massage-Gutscheine",
     "save_buying_session_packages": "Sparen Sie beim Kauf von Sitzungspaketen mit Rabatt",
     
     // Manage Booking
     "enter_email_or_phone": "Bitte geben Sie Ihre E-Mail oder Telefon ein",
     
     // Form labels
     "name_label": "Name",
     "close": "Schließen",
     
     // Package names translations (German)
     "bono_5_masajes_piernas_cansadas": "5er-Paket Müde Beine Massage",
     "bono_5_masajes_55": "5er-Paket Massage 55'",
     "bono_5_sesiones_shiatsu": "5er-Paket Shiatsu-Sitzungen",
     "bono_5_masajes_relajante": "5er-Paket Entspannungsmassage",
     "bono_5_masajes_descontracturante": "5er-Paket Therapeutische Massage",
     "bono_5_masajes_75_minutos": "5er-Paket Massage 75 Minuten",
     "bono_10_masajes_55": "10er-Paket Massage 55'",
     "bono_10_masajes_75": "10er-Paket Massage 75'",
     "bono_5_masajes_dos_personas_45_minutos": "5er-Paket Paarmassage 45 Minuten",
     "bono_10_masajes_55_minutos": "10er-Paket Massage 55 Minuten",
     "bono_10_masajes_reductor_anticelulitico": "10er-Paket Anti-Cellulite Massage",
     "bono_10_masajes_para_embarazada": "10er-Paket Schwangerschaftsmassage",
     "bono_5_masajes_dos_personas_75_minutos": "5er-Paket Paarmassage 75 Minuten",
     "bono_5_masajes_para_embarazada": "5er-Paket Schwangerschaftsmassage",
     "bono_5_masajes_reductor_anticelulitico": "5er-Paket Anti-Cellulite Massage",
     "bono_5_masajes_55_minutos": "5er-Paket Massage 55 Minuten",
     "piernas_cansadas": "Müde Beine",
     "masaje_descontracturante_55_minutos": "Therapeutische Massage 55 Minuten",
     "reflexologia_podal": "Fußreflexzonenmassage",
     "shiatsu": "Shiatsu",
     "masaje_para_embarazada_50_minutos": "Schwangerschaftsmassage 50 Minuten",
     "masaje_relajante_55_minutos": "Entspannungsmassage 55 Minuten",
     "masaje_deportivo_50_minutos": "Sportmassage 50 Minuten",
     "masaje_con_piedras_calientes": "Hot Stone Massage",
     "bambuterapia_masaje_con_canas_de_bambu": "Bambus-Therapie Massage",
     "ritual_romantico_individual": "Romantisches Ritual Einzeln",
     "ritual_energizante_individual": "Energierendes Ritual Einzeln",
     "drenaje_linfatico_75_minutos": "Lymphdrainage 75 Minuten",
     "antiestres_the_nook": "Anti-Stress The Nook",
     "masaje_para_embarazada_75_minutos": "Schwangerschaftsmassage 75 Minuten",
     "masaje_descontracturante_75_minutos": "Therapeutische Massage 75 Minuten",
     "masaje_dos_personas_45_minutos": "Paarmassage 45 Minuten",
     "ritual_del_kobido_individual": "Kobido Ritual Einzeln",
     "masaje_90_minutos": "Massage 90 Minuten",
     "ritual_sakura_individual": "Sakura Ritual Einzeln",
     "masaje_dos_personas_55_minutos": "Paarmassage 55 Minuten",
     "masaje_a_cuatro_manos_50_minutos": "Vier-Hände-Massage 50 Minuten",
     "masaje_relajante_extra_largo_110_minutos": "Extra lange Entspannungsmassage 110 Minuten",
     "bambuterapia_masaje_con_canas_de_bambu_para_dos_personas": "Bambus-Therapie für zwei Personen",
     "masaje_con_piedras_calientes_para_dos_personas": "Hot Stone Massage für zwei",
     "ritual_beauty_individual": "Beauty Ritual Einzeln",
     "ritual_energizante_para_dos_personas": "Energierendes Ritual für zwei",
     "ritual_romantico_para_dos_personas": "Romantisches Ritual für zwei",
     "masaje_dos_personas_75_minutos": "Paarmassage 75 Minuten",
     "masaje_a_cuatro_manos_80_minutos": "Vier-Hände-Massage 80 Minuten",
     "ritual_del_kobido_para_dos_personas": "Kobido Ritual für zwei",
     "masaje_dos_personas_110_minutos": "Paarmassage 110 Minuten",
     "ritual_sakura_para_dos_personas": "Sakura Ritual für zwei",
     "ritual_beauty_para_dos_personas": "Beauty Ritual für zwei",
     "tarjeta_regalo_por_valor_personalizado": "GESCHENKKARTE für INDIVIDUELLEN Wert",
     
     // Gift card configuration
     "gift_card_config": "Geschenkkarten-Konfiguration",
     "show_price_on_card": "Preis auf der Karte anzeigen?",
     "who_to_send_card": "An wen soll die Karte gesendet werden?",
     "send_to_buyer": "An Käufer senden",
     "send_to_recipient": "Direkt an Empfänger senden",
     "show_buyer_data": "Käuferdaten anzeigen?",
     "complete_payment": "Zahlung Abschließen",
     "buy_button": "Kaufen",
     "custom_gift_card": "GESCHENKKARTE für INDIVIDUELLEN Wert",
     "custom_description": "Wählen Sie einen festen Betrag oder geben Sie einen anderen Betrag ein.",
     "custom_placeholder": "Anderer Betrag (€)",
     "valid_amount": "Bitte geben Sie einen gültigen Betrag an",
     "proceed_to_payment": "Zur Zahlung",
     "empty_cart": "Leeren",
     "your_cart": "Ihr Warenkorb",
     "cart_empty": "Ihr Warenkorb ist leer.",
     "remove": "Entfernen",
     "purchased_by_name": "Gekauft von (Name)",
     "buyer_name_placeholder": "Name des Käufers",
     "buyer_email": "Email des Käufers",
     "buyer_email_placeholder": "email@beispiel.com",
     "is_gift": "Ist es ein Geschenk?",
     "recipient_name_required": "Für (Name des Empfängers) *",
     "recipient_name_placeholder": "Name des Empfängers",
     "recipient_email": "Email des Empfängers",
     "gift_message": "Geschenknachricht (optional)",
     "gift_message_placeholder": "Ihre persönliche Nachricht...",
     "empty_cart_button": "Leeren",
     "individual_massages_packages": "Geschenkkarten für Individuelle Massagen",
     "couples_packages": "Geschenkkarten für Paar-Massagen", 
     "four_hands_packages": "Geschenkkarten für Vier-Hände-Massagen",
     "rituals_packages": "Geschenkkarten für Rituale",
    "custom_amount": "Benutzerdefinierter Betrag",
    "gift_card_group_individual": "Geschenkkarte – Einzelmassage",
    "gift_card_group_couples": "Geschenkkarte – Paarmassage",
    "gift_card_group_four_hands": "Geschenkkarte – Vier‑Hände‑Massage",
    "gift_card_group_individual_rituals": "Geschenkkarte – Einzelrituale",
    "gift_card_group_couples_rituals": "Geschenkkarte – Rituale für Zwei",
    "gift_card_group_multi_sessions": "Geschenkkarte – Mehrere Sitzungen",
    "rituals_for_two": "Rituale für Zwei",
    "custom_gift_card_title": "Personalisierte Geschenkkarte",
    "choose_amount_for": "Wählen Sie den Betrag für",
    "customize": "Anpassen",
    "other_value_label": "Anderer Betrag (€)",
    "add": "Hinzufügen",
    "value_min_max_note": "Minimum: 10 € – Maximum: 500 €",
    "customize_gift_card_title": "Geschenkkarte anpassen",
    "customize_gift_card_description_prefix": "Wählen Sie den Betrag der Geschenkkarte für",
    
    // Additional missing translations
    "existing_bookings": "Bestehende Buchungen",
    "processing": "Wird verarbeitet...",
    "continue": "Fortfahren",
    "no_availability": "Keine Verfügbarkeit",
    "no_availability_message": "Keine Gänge verfügbar für diesen Service zur ausgewählten Zeit. Bitte wählen Sie eine andere Zeit.",
    "full_capacity": "Volle Kapazität",
    "full_capacity_message": "Dieser Zeitraum hat bereits das Maximum von 4 Buchungen erreicht. Bitte wählen Sie einen anderen Zeitraum.",
    "address": "Adresse",
    "copyright": "© THE NOOK Madrid 2025 · Alle Rechte vorbehalten",
    "redirecting_to_stripe": "Weiterleitung zu Stripe...",
    "package_not_found": "Das ausgewählte Paket wurde nicht gefunden. Bitte aktualisieren Sie die Seite und versuchen Sie es erneut.",
    "individual_massages_label": "🧘 Einzelmassagen",
    "four_hands_massages_label": "✋ Vier-Hände-Massagen",
    "rituals_label": "🌸 Rituale",
    "for_two_people_label": "💑 Für Zwei Personen",
    "no_lanes_available": "Keine Gänge verfügbar",
    "past_time": "Vergangene Zeit",
    "no_availability_simple": "Keine Verfügbarkeit",
    "chamberi_zurbaran": "Chamberí - Zurbarán",
    "chamartin_concha_espina": "Chamartín - Concha Espina",
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
     
     // Package/Voucher related
     "massage_vouchers": "Buoni Massaggio",
     "save_buying_session_packages": "Risparmia acquistando pacchetti di sessioni con sconto",
     
     // Manage Booking
     "enter_email_or_phone": "Per favore inserisci la tua email o telefono",
     
     // Form labels
     "name_label": "Nome",
     "close": "Chiudi",
     
     // Package names translations (Italian)
     "bono_5_masajes_piernas_cansadas": "Pacchetto 5 massaggi Gambe Stanche",
     "bono_5_masajes_55": "Pacchetto 5 massaggi 55'",
     "bono_5_sesiones_shiatsu": "Pacchetto 5 sessioni di Shiatsu",
     "bono_5_masajes_relajante": "Pacchetto 5 massaggi Rilassanti",
     "bono_5_masajes_descontracturante": "Pacchetto 5 massaggi Terapeutici",
     "bono_5_masajes_75_minutos": "Pacchetto 5 massaggi 75 minuti",
     "bono_10_masajes_55": "Pacchetto 10 massaggi 55'",
     "bono_10_masajes_75": "Pacchetto 10 massaggi 75'",
     "bono_5_masajes_dos_personas_45_minutos": "Pacchetto 5 massaggi coppia 45 minuti",
     "bono_10_masajes_55_minutos": "Pacchetto 10 massaggi 55 minuti",
     "bono_10_masajes_reductor_anticelulitico": "Pacchetto 10 massaggi anticellulite",
     "bono_10_masajes_para_embarazada": "Pacchetto 10 massaggi prenatali",
     "bono_5_masajes_dos_personas_75_minutos": "Pacchetto 5 massaggi coppia 75 minuti",
     "bono_5_masajes_para_embarazada": "Pacchetto 5 massaggi prenatali",
     "bono_5_masajes_reductor_anticelulitico": "Pacchetto 5 massaggi anticellulite",
     "bono_5_masajes_55_minutos": "Pacchetto 5 massaggi 55 minuti",
     "piernas_cansadas": "Gambe Stanche",
     "masaje_descontracturante_55_minutos": "Massaggio Terapeutico 55 minuti",
     "reflexologia_podal": "Riflessologia Plantare",
     "shiatsu": "Shiatsu",
     "masaje_para_embarazada_50_minutos": "Massaggio Prenatale 50 minuti",
     "masaje_relajante_55_minutos": "Massaggio Rilassante 55 minuti",
     "masaje_deportivo_50_minutos": "Massaggio Sportivo 50 minuti",
     "masaje_con_piedras_calientes": "Massaggio con Pietre Calde",
     "bambuterapia_masaje_con_canas_de_bambu": "Bambu Terapia Massaggio",
     "ritual_romantico_individual": "Rituale Romantico Individuale",
     "ritual_energizante_individual": "Rituale Energizzante Individuale",
     "drenaje_linfatico_75_minutos": "Drenaggio Linfatico 75 minuti",
     "antiestres_the_nook": "Anti-stress The Nook",
     "masaje_para_embarazada_75_minutos": "Massaggio Prenatale 75 minuti",
     "masaje_descontracturante_75_minutos": "Massaggio Terapeutico 75 minuti",
     "masaje_dos_personas_45_minutos": "Massaggio coppia 45 minuti",
     "ritual_del_kobido_individual": "Rituale Kobido individuale",
     "masaje_90_minutos": "Massaggio 90 minuti",
     "ritual_sakura_individual": "Rituale Sakura individuale",
     "masaje_dos_personas_55_minutos": "Massaggio coppia 55 minuti",
     "masaje_a_cuatro_manos_50_minutos": "Massaggio a quattro mani 50 minuti",
     "masaje_relajante_extra_largo_110_minutos": "Massaggio rilassante extra lungo 110 minuti",
     "bambuterapia_masaje_con_canas_de_bambu_para_dos_personas": "Bambu terapia per due persone",
     "masaje_con_piedras_calientes_para_dos_personas": "Massaggio pietre calde per due",
     "ritual_beauty_individual": "Rituale beauty individuale",
     "ritual_energizante_para_dos_personas": "Rituale energizzante per due",
     "ritual_romantico_para_dos_personas": "Rituale romantico per due",
     "masaje_dos_personas_75_minutos": "Massaggio coppia 75 minuti",
     "masaje_a_cuatro_manos_80_minutos": "Massaggio a quattro mani 80 minuti",
     "ritual_del_kobido_para_dos_personas": "Rituale Kobido per due",
     "masaje_dos_personas_110_minutos": "Massaggio coppia 110 minuti",
     "ritual_sakura_para_dos_personas": "Rituale Sakura per due",
     "ritual_beauty_para_dos_personas": "Rituale beauty per due",
     "tarjeta_regalo_por_valor_personalizado": "CARTA REGALO per VALORE personalizzato",
     
     // Gift card configuration
     "gift_card_config": "Configurazione Carta Regalo",
     "show_price_on_card": "Mostrare il prezzo sulla carta?",
     "who_to_send_card": "A chi inviare la carta?",
     "send_to_buyer": "Invia all'acquirente",
     "send_to_recipient": "Invia direttamente al beneficiario",
     "show_buyer_data": "Mostrare dati dell'acquirente?",
     "complete_payment": "Completa Pagamento",
     "buy_button": "Acquista",
     "custom_gift_card": "CARTA REGALO per VALORE personalizzato",
     "custom_description": "Scegli un importo fisso o inserisci un altro importo.",
     "custom_placeholder": "Altro importo (€)",
     "valid_amount": "Indica un importo valido",
     "proceed_to_payment": "Procedi al Pagamento",
     "empty_cart": "Svuota",
     "your_cart": "Il tuo carrello",
     "cart_empty": "Il tuo carrello è vuoto.",
     "remove": "Rimuovi",
     "purchased_by_name": "Acquistato da (nome)",
     "buyer_name_placeholder": "Nome dell'acquirente",
     "buyer_email": "Email dell'acquirente",
     "buyer_email_placeholder": "email@esempio.com",
     "is_gift": "È un regalo?",
     "recipient_name_required": "Per (nome del beneficiario) *",
     "recipient_name_placeholder": "Nome del beneficiario",
     "recipient_email": "Email del beneficiario",
     "gift_message": "Messaggio regalo (opzionale)",
     "gift_message_placeholder": "Il tuo messaggio personalizzato...",
     "empty_cart_button": "Svuota",
     "individual_massages_packages": "Carte Regalo Massaggi Individuali",
     "couples_packages": "Carte Regalo Massaggi di Coppia",
     "four_hands_packages": "Carte Regalo Massaggi a Quattro Mani", 
     "rituals_packages": "Carte Regalo Rituali",
    "custom_amount": "Importo Personalizzato",
    "gift_card_group_individual": "Carta Regalo – Massaggio Individuale",
    "gift_card_group_couples": "Carta Regalo – Massaggio di Coppia",
    "gift_card_group_four_hands": "Carta Regalo – Massaggio a Quattro Mani",
    "gift_card_group_individual_rituals": "Carta Regalo – Rituali Individuali",
    "gift_card_group_couples_rituals": "Carta Regalo – Rituali per Due",
    "gift_card_group_multi_sessions": "Carta Regalo – Pacchetti multi‑sessione",
    "rituals_for_two": "Rituali per Due",
    "custom_gift_card_title": "Carta Regalo Personalizzata",
    "choose_amount_for": "Scegli l’importo per",
    "customize": "Personalizza",
    "other_value_label": "Altro importo (€)",
    "add": "Aggiungi",
    "value_min_max_note": "Minimo: €10 – Massimo: €500",
    "customize_gift_card_title": "Personalizza Carta Regalo",
    "customize_gift_card_description_prefix": "Seleziona l'importo della carta regalo per",
    
    // Additional missing translations
    "existing_bookings": "Prenotazioni Esistenti",
    "processing": "Elaborazione...",
    "continue": "Continua",
    "no_availability": "Nessuna Disponibilità",
    "no_availability_message": "Nessun corridoio disponibile per questo servizio nell'orario selezionato. Si prega di scegliere un altro orario.",
    "full_capacity": "Capacità Completa",
    "full_capacity_message": "Questo slot orario ha già raggiunto il massimo di 4 prenotazioni. Si prega di scegliere un altro slot.",
    "address": "Indirizzo",
    "copyright": "© THE NOOK Madrid 2025 · Tutti i diritti riservati",
    "redirecting_to_stripe": "Reindirizzamento a Stripe...",
    "package_not_found": "Il pacchetto selezionato non è stato trovato. Si prega di aggiornare la pagina e riprovare.",
    "individual_massages_label": "🧘 Massaggi Individuali",
    "four_hands_massages_label": "✋ Massaggi a Quattro Mani",
    "rituals_label": "🌸 Rituali",
    "for_two_people_label": "💑 Per Due Persone",
    "no_lanes_available": "Nessun corridoio disponibile",
    "past_time": "Orario passato",
    "no_availability_simple": "Nessuna disponibilità",
    "chamberi_zurbaran": "Chamberí - Zurbarán",
    "chamartin_concha_espina": "Chamartín - Concha Espina",
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
     
     // Package/Voucher related
     "massage_vouchers": "Vouchers de Massagem",
     "save_buying_session_packages": "Poupe comprando pacotes de sessões com desconto",
     
     // Manage Booking
     "enter_email_or_phone": "Por favor insira o seu email ou telefone",
     
     // Form labels
     "name_label": "Nome",
     "close": "Fechar",
     
     // Package names translations (Portuguese)
     "bono_5_masajes_piernas_cansadas": "Pacote 5 massagens Pernas Cansadas",
     "bono_5_masajes_55": "Pacote 5 massagens 55'",
     "bono_5_sesiones_shiatsu": "Pacote 5 sessões de Shiatsu",
     "bono_5_masajes_relajante": "Pacote 5 massagens Relaxantes",
     "bono_5_masajes_descontracturante": "Pacote 5 massagens Terapêuticas",
     "bono_5_masajes_75_minutos": "Pacote 5 massagens 75 minutos",
     "bono_10_masajes_55": "Pacote 10 massagens 55'",
     "bono_10_masajes_75": "Pacote 10 massagens 75'",
     "bono_5_masajes_dos_personas_45_minutos": "Pacote 5 massagens casal 45 minutos",
     "bono_10_masajes_55_minutos": "Pacote 10 massagens 55 minutos",
     "bono_10_masajes_reductor_anticelulitico": "Pacote 10 massagens anticelulite",
     "bono_10_masajes_para_embarazada": "Pacote 10 massagens pré-natais",
     "bono_5_masajes_dos_personas_75_minutos": "Pacote 5 massagens casal 75 minutos",
     "bono_5_masajes_para_embarazada": "Pacote 5 massagens pré-natais",
     "bono_5_masajes_reductor_anticelulitico": "Pacote 5 massagens anticelulite",
     "bono_5_masajes_55_minutos": "Pacote 5 massagens 55 minutos",
     "piernas_cansadas": "Pernas Cansadas",
     "masaje_descontracturante_55_minutos": "Massagem Terapêutica 55 minutos",
     "reflexologia_podal": "Reflexologia Podal",
     "shiatsu": "Shiatsu",
     "masaje_para_embarazada_50_minutos": "Massagem Pré-natal 50 minutos",
     "masaje_relajante_55_minutos": "Massagem Relaxante 55 minutos",
     "masaje_deportivo_50_minutos": "Massagem Desportiva 50 minutos",
     "masaje_con_piedras_calientes": "Massagem com Pedras Quentes",
     "bambuterapia_masaje_con_canas_de_bambu": "Bambu Terapia Massagem",
     "ritual_romantico_individual": "Ritual Romântico Individual",
     "ritual_energizante_individual": "Ritual Energizante Individual",
     "drenaje_linfatico_75_minutos": "Drenagem Linfática 75 minutos",
     "antiestres_the_nook": "Anti-stress The Nook",
     "masaje_para_embarazada_75_minutos": "Massagem Pré-natal 75 minutos",
     "masaje_descontracturante_75_minutos": "Massagem Terapêutica 75 minutos",
     "masaje_dos_personas_45_minutos": "Massagem casal 45 minutos",
     "ritual_del_kobido_individual": "Ritual Kobido individual",
     "masaje_90_minutos": "Massagem 90 minutos",
     "ritual_sakura_individual": "Ritual Sakura individual",
     "masaje_dos_personas_55_minutos": "Massagem casal 55 minutos",
     "masaje_a_cuatro_manos_50_minutos": "Massagem a quatro mãos 50 minutos",
     "masaje_relajante_extra_largo_110_minutos": "Massagem relaxante extra longa 110 minutos",
     "bambuterapia_masaje_con_canas_de_bambu_para_dos_personas": "Bambu terapia para duas pessoas",
     "masaje_con_piedras_calientes_para_dos_personas": "Massagem pedras quentes para dois",
     "ritual_beauty_individual": "Ritual beauty individual",
     "ritual_energizante_para_dos_personas": "Ritual energizante para dois",
     "ritual_romantico_para_dos_personas": "Ritual romântico para dois",
     "masaje_dos_personas_75_minutos": "Massagem casal 75 minutos",
     "masaje_a_cuatro_manos_80_minutos": "Massagem a quatro mãos 80 minutos",
     "ritual_del_kobido_para_dos_personas": "Ritual Kobido para dois",
     "masaje_dos_personas_110_minutos": "Massagem casal 110 minutos",
     "ritual_sakura_para_dos_personas": "Ritual Sakura para dois",
     "ritual_beauty_para_dos_personas": "Ritual beauty para dois",
     "tarjeta_regalo_por_valor_personalizado": "CARTÃO PRESENTE para VALOR personalizado",
     
     // Gift card configuration
     "gift_card_config": "Configuração do Cartão Presente",
     "show_price_on_card": "Mostrar preço no cartão?",
     "who_to_send_card": "Para quem enviar o cartão?",
     "send_to_buyer": "Enviar para o comprador",
     "send_to_recipient": "Enviar diretamente para o beneficiário",
     "show_buyer_data": "Mostrar dados do comprador?",
     "complete_payment": "Finalizar Pagamento",
     "buy_button": "Comprar",
     "custom_gift_card": "CARTÃO PRESENTE para VALOR personalizado",
     "custom_description": "Escolha um valor fixo ou escreva outro valor.",
     "custom_placeholder": "Outro valor (€)",
     "valid_amount": "Indique um valor válido",
     "proceed_to_payment": "Prosseguir para Pagamento",
     "empty_cart": "Esvaziar",
     "your_cart": "Seu carrinho",
     "cart_empty": "Seu carrinho está vazio.",
     "remove": "Remover",
     "purchased_by_name": "Comprado por (nome)",
     "buyer_name_placeholder": "Nome do comprador",
     "buyer_email": "Email do comprador",
     "buyer_email_placeholder": "email@exemplo.com",
     "is_gift": "É um presente?",
     "recipient_name_required": "Para (nome do beneficiário) *",
     "recipient_name_placeholder": "Nome do beneficiário",
     "recipient_email": "Email do beneficiário",
     "gift_message": "Mensagem do presente (opcional)",
     "gift_message_placeholder": "Sua mensagem personalizada...",
     "empty_cart_button": "Esvaziar",
     "individual_massages_packages": "Cartões Presente de Massagens Individuais",
     "couples_packages": "Cartões Presente de Massagens para Casais",
     "four_hands_packages": "Cartões Presente de Massagens a Quatro Mãos",
     "rituals_packages": "Cartões Presente de Rituais", 
    "custom_amount": "Valor Personalizado",
    "gift_card_group_individual": "Cartão‑Presente – Massagem Individual",
    "gift_card_group_couples": "Cartão‑Presente – Massagem para Duas Pessoas",
    "gift_card_group_four_hands": "Cartão‑Presente – Massagem a Quatro Mãos",
    "gift_card_group_individual_rituals": "Cartão‑Presente – Rituais Individuais",
    "gift_card_group_couples_rituals": "Cartão‑Presente – Rituais para Dois",
    "gift_card_group_multi_sessions": "Cartão‑Presente – Pacotes de várias sessões",
    "rituals_for_two": "Rituais para Dois",
    "custom_gift_card_title": "Cartão‑Presente Personalizado",
    "choose_amount_for": "Escolhe o valor para",
    "customize": "Personalizar",
    "other_value_label": "Outro valor (€)",
    "add": "Adicionar",
    "value_min_max_note": "Mínimo: 10 € – Máximo: 500 €",
    "customize_gift_card_title": "Personalizar Cartão‑Presente",
    "customize_gift_card_description_prefix": "Seleciona o valor do cartão‑presente para",
    
    // Additional missing translations
    "existing_bookings": "Reservas Existentes",
    "processing": "Processando...",
    "continue": "Continuar",
    "no_availability": "Sem Disponibilidade",
    "no_availability_message": "Nenhum corredor disponível para este serviço no horário selecionado. Por favor, escolha outro horário.",
    "full_capacity": "Capacidade Completa",
    "full_capacity_message": "Este horário já atingiu o máximo de 4 reservas. Por favor, escolha outro horário.",
    "address": "Endereço",
    "copyright": "© THE NOOK Madrid 2025 · Todos os direitos reservados",
    "redirecting_to_stripe": "Redirecionando para Stripe...",
    "package_not_found": "O pacote selecionado não foi encontrado. Por favor, atualize a página e tente novamente.",
    "individual_massages_label": "🧘 Massagens Individuais",
    "four_hands_massages_label": "✋ Massagens a Quatro Mãos",
    "rituals_label": "🌸 Rituais",
    "for_two_people_label": "💑 Para Duas Pessoas",
    "no_lanes_available": "Nenhum corredor disponível",
    "past_time": "Horário passado",
    "no_availability_simple": "Sem disponibilidade",
    "chamberi_zurbaran": "Chamberí - Zurbarán",
    "chamartin_concha_espina": "Chamartín - Concha Espina",
  },
  zh: {
    // Header / Landing
    "admin": "管理",
    "back": "返回",
    "wellness_center": "身心健康中心",
    "landing_subtitle": "在我们独家的按摩中心探索放松与健康的完美平衡",
    "book_appointment": "预约",
    "book_description": "预约您的放松按摩",
    "book_now": "立即预约",
    "gift_cards": "礼品卡",
    "gift_description": "赠送独特的身心健康体验",
    "our_locations": "我们的门店",
    "locations_subtitle": "在马德里找到我们",
    "open_maps": "在地图中打开",
    "hours": "营业时间",
    "rights_reserved": "版权所有",

    // Bonos / Vouchers page
    "massage_vouchers": "按摩套餐",
    "save_buying_session_packages": "购买多次套餐更优惠",
    "cart": "购物车",
    "your_cart": "您的购物车",
    "cart_empty": "您的购物车是空的。",
    "empty_cart": "清空",
    "empty_cart_button": "清空",
    "total": "合计",
    "buy_button": "购买",

    // Packages groups (Bonos)
    "individual_massages_packages": "单人按摩套餐",
    "couples_packages": "双人按摩套餐",
    "four_hands_packages": "四手按摩套餐",
    "rituals_packages": "单人仪式套餐",
    "rituals_for_two": "双人仪式套餐",
    "sessions_count": "次",
    "no_individual_vouchers": "暂无单人套餐",
    "no_two_people_vouchers": "暂无双人套餐",
    "no_four_hands_vouchers": "暂无四手按摩套餐",
    "no_ritual_vouchers": "暂无仪式套餐",

    // Gift Cards page
    "gift_cards_page": "礼品卡",
    "gift_cards_subtitle": "选择您的礼品卡。优雅设计，100% 自适应。",
    "add_to_cart": "加入购物车",
    "added_to_cart": "已加入购物车",
    "custom_amount": "自定义金额",
    "custom_gift_card": "自定义金额礼品卡",
    "custom_gift_card_title": "自定义礼品卡",
    "choose_amount_for": "选择金额：",
    "customize": "自定义",
    "other_value_label": "其他金额 (€)",
    "add": "添加",
    "value_min_max_note": "最小：10€ · 最大：500€",
    "customize_gift_card_title": "自定义礼品卡",
    "customize_gift_card_description_prefix": "请选择礼品卡金额：",
    "gift_card_group_individual": "礼品卡 - 单人按摩",
    "gift_card_group_couples": "礼品卡 - 双人按摩",
    "gift_card_group_four_hands": "礼品卡 - 四手按摩",
    "gift_card_group_individual_rituals": "礼品卡 - 单人仪式",
    "gift_card_group_couples_rituals": "礼品卡 - 双人仪式",
    "gift_card_group_multi_sessions": "礼品卡 - 多次疗程套餐",

    // Forms / Checkout
    "purchased_by_name": "购买者（姓名）",
    "buyer_name_placeholder": "购买者姓名",
    "buyer_email": "购买者邮箱",
    "buyer_email_placeholder": "email@示例.com",
    "is_gift": "是否为礼物？",
    "recipient_name_required": "收件人（姓名）*",
    "recipient_name_placeholder": "收件人姓名",
    "recipient_email": "收件人邮箱",
    "gift_message": "礼物留言（可选）",
    "gift_message_placeholder": "您的个性化留言…",

    // Client reservation minimal strings
    "loading_centers": "正在加载门店…",
    "error": "错误",
    "select_service_error": "请选择一个服务",
    "complete_required_fields": "请填写必填字段",
    // Landing Vouchers card
    "vouchers": "套餐",
    "vouchers_description": "购买优惠的多次套餐",
    "buy_voucher": "购买套餐",

    // Reservation labels
    "personal_information": "个人信息",
    "name_label": "姓名",
    "phone": "电话",
    "phone_placeholder": "+34 600 000 000",
    "email": "邮箱",
    "email_placeholder": "client@email.com",
    "center_selection": "门店选择",
    "center": "门店",
    "service_selection": "服务选择",
    "date": "日期",
    "select_date": "选择日期",
    "time": "时间",
    "select_time": "选择时间",
    "additional_notes": "附加备注",
    "notes_placeholder_form": "任何您认为重要的附加信息…",
    "booking_summary": "预订摘要",
    "method_card": "银行卡",
    "secure_payment_with_stripe": "通过 Stripe 处理的 100% 安全支付",
    
    // Additional missing translations
    "existing_bookings": "现有预订",
    "processing": "处理中...",
    "continue": "继续",
    "no_availability": "无可用性",
    "no_availability_message": "所选时间没有可用的服务通道。请选择其他时间。",
    "full_capacity": "已满",
    "full_capacity_message": "此时段已达到最多4个预订。请选择其他时段。",
    "address": "地址",
    "copyright": "© THE NOOK Madrid 2025 · 版权所有",
    "redirecting_to_stripe": "正在重定向到 Stripe...",
    "package_not_found": "未找到所选套餐。请刷新页面并重试。",
    "individual_massages_label": "🧘 单人按摩",
    "four_hands_massages_label": "✋ 四手按摩",
    "rituals_label": "🌸 仪式",
    "for_two_people_label": "💑 双人",
    "no_lanes_available": "无可用通道",
    "past_time": "已过时间",
    "no_availability_simple": "无可用性",
    "chamberi_zurbaran": "Chamberí - Zurbarán",
    "chamartin_concha_espina": "Chamartín - Concha Espina",
  },
  ar: {
    // Header / Landing
    "admin": "الإدارة",
    "back": "رجوع",
    "wellness_center": "مركز العافية",
    "landing_subtitle": "اكتشف التوازن المثالي بين الاسترخاء والعافية في مركزنا الحصري للتدليك",
    "book_appointment": "احجز موعداً",
    "book_description": "احجز جلسة تدليك مريحة",
    "book_now": "احجز الآن",
    "gift_cards": "بطاقات الهدايا",
    "gift_description": "أهدِ تجارب عافية فريدة",
    "our_locations": "مواقعنا",
    "locations_subtitle": "اعثر علينا في مدريد",
    "open_maps": "افتح في الخرائط",
    "hours": "ساعات العمل",
    "rights_reserved": "جميع الحقوق محفوظة",

    // Landing Vouchers card
    "vouchers": "الباقات",
    "vouchers_description": "اشترِ باقات جلسات بخصم",
    "buy_voucher": "شراء باقة",

    // Bonos / Vouchers page
    "massage_vouchers": "باقات التدليك",
    "save_buying_session_packages": "وفّر عند شراء باقات الجلسات المخفّضة",
    "cart": "السلة",
    "your_cart": "سلتك",
    "cart_empty": "سلتك فارغة.",
    "empty_cart": "تفريغ",
    "empty_cart_button": "تفريغ",
    "total": "الإجمالي",
    "buy_button": "شراء",

    // Packages groups (Bonos)
    "individual_massages_packages": "باقات التدليك الفردي",
    "couples_packages": "باقات تدليك لشخصين",
    "four_hands_packages": "باقات تدليك بأربع أيادٍ",
    "rituals_packages": "باقات الطقوس الفردية",
    "rituals_for_two": "باقات طقوس لشخصين",
    "sessions_count": "جلسات",
    "no_individual_vouchers": "لا توجد باقات فردية",
    "no_two_people_vouchers": "لا توجد باقات لشخصين",
    "no_four_hands_vouchers": "لا توجد باقات بأربع أيادٍ",
    "no_ritual_vouchers": "لا توجد باقات طقوس",

    // Gift Cards page
    "gift_cards_page": "بطاقات الهدايا",
    "gift_cards_subtitle": "اختر بطاقة الهدية الخاصة بك. تصميم أنيق ومتجاوب بالكامل.",
    "add_to_cart": "أضف إلى السلة",
    "added_to_cart": "تمت الإضافة إلى السلة",
    "custom_amount": "مبلغ مخصص",
    "custom_gift_card": "بطاقة هدية بمبلغ مخصص",
    "custom_gift_card_title": "تخصيص بطاقة الهدية",
    "choose_amount_for": "اختر المبلغ لـ",
    "customize": "تخصيص",
    "other_value_label": "مبلغ آخر (€)",
    "add": "إضافة",
    "value_min_max_note": "الحد الأدنى: 10€ · الحد الأقصى: 500€",
    "customize_gift_card_description_prefix": "اختر مبلغ بطاقة الهدية لـ",
    "gift_card_group_individual": "بطاقة هدية - تدليك فردي",
    "gift_card_group_couples": "بطاقة هدية - تدليك لشخصين",
    "gift_card_group_four_hands": "بطاقة هدية - تدليك بأربع أيادٍ",
    "gift_card_group_individual_rituals": "بطاقة هدية - طقوس فردية",
    "gift_card_group_couples_rituals": "بطاقة هدية - طقوس لشخصين",
    "gift_card_group_multi_sessions": "بطاقة هدية - باقات جلسات متعددة",

    // Forms / Checkout
    "purchased_by_name": "الشراء بواسطة (الاسم)",
    "buyer_name_placeholder": "اسم المشتري",
    "buyer_email": "بريد المشتري الإلكتروني",
    "buyer_email_placeholder": "email@مثال.com",
    "is_gift": "هل هي هدية؟",
    "recipient_name_required": "إلى (اسم المستلم) *",
    "recipient_name_placeholder": "اسم المستلم",
    "recipient_email": "بريد المستلم الإلكتروني",
    "gift_message": "رسالة مع الهدية (اختياري)",
    "gift_message_placeholder": "رسالتك المخصصة…",

    // Client reservation (labels)
    "loading_centers": "جارٍ تحميل المراكز…",
    "error": "خطأ",
    "select_service_error": "يرجى اختيار خدمة",
    "complete_required_fields": "يرجى إكمال الحقول المطلوبة",
    "personal_information": "المعلومات الشخصية",
    "name_label": "الاسم",
    "phone": "الهاتف",
    "phone_placeholder": "+34 600 000 000",
    "email": "البريد الإلكتروني",
    "email_placeholder": "client@email.com",
    "center_selection": "اختيار المركز",
    "center": "المركز",
    "service_selection": "اختيار الخدمة",
    "date": "التاريخ",
    "select_date": "اختر التاريخ",
    "time": "الوقت",
    "select_time": "اختر الوقت",
    "additional_notes": "ملاحظات إضافية",
    "notes_placeholder_form": "أي معلومات إضافية تراها مهمة…",
    "booking_summary": "ملخص الحجز",
    "method_card": "بطاقة",
    "secure_payment_with_stripe": "دفع آمن 100٪ تتم معالجته عبر Stripe",
    
    // Additional missing translations
    "existing_bookings": "الحجوزات الموجودة",
    "processing": "جاري المعالجة...",
    "continue": "متابعة",
    "no_availability": "لا يوجد توفر",
    "no_availability_message": "لا توجد ممرات متاحة لهذه الخدمة في الوقت المحدد. يرجى اختيار وقت آخر.",
    "full_capacity": "القدرة الكاملة",
    "full_capacity_message": "هذا الفترة الزمنية قد وصلت بالفعل إلى الحد الأقصى من 4 حجوزات. يرجى اختيار فترة أخرى.",
    "address": "العنوان",
    "copyright": "© THE NOOK Madrid 2025 · جميع الحقوق محفوظة",
    "redirecting_to_stripe": "إعادة التوجيه إلى Stripe...",
    "package_not_found": "لم يتم العثور على الباقة المحددة. يرجى تحديث الصفحة والمحاولة مرة أخرى.",
    "individual_massages_label": "🧘 تدليك فردي",
    "four_hands_massages_label": "✋ تدليك بأربع أيادٍ",
    "rituals_label": "🌸 طقوس",
    "for_two_people_label": "💑 لشخصين",
    "no_lanes_available": "لا توجد ممرات متاحة",
    "past_time": "وقت مضى",
    "no_availability_simple": "لا يوجد توفر",
    "chamberi_zurbaran": "Chamberí - Zurbarán",
    "chamartin_concha_espina": "Chamartín - Concha Espina",
  }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations['es'];

export const findTranslationKeyByValue = (value: string): TranslationKey | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  for (const langEntries of Object.values(translations)) {
    for (const [key, val] of Object.entries(langEntries)) {
      if (typeof val === 'string' && val.trim().toLowerCase() === normalized) {
        return key as TranslationKey;
      }
    }
  }
  return null;
};

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
// Helper function to translate service names
export const translateServiceName = (serviceName: string, language: string, t: (key: string) => string): string => {
  // En español, devolver el nombre original
  if (language === 'es') {
    return serviceName;
  }

  // Primero, buscar si el nombre exacto está en las traducciones
  const findTranslationKeyByValue = (value: string): string | null => {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    // Buscar en todas las traducciones
    for (const langKey of Object.keys(translations)) {
      const langTranslations = (translations as any)[langKey];
      for (const [key, val] of Object.entries(langTranslations)) {
        if (typeof val === 'string' && val.trim().toLowerCase() === normalized) {
          return key;
        }
      }
    }
    return null;
  };

  // Mapeo de nombres comunes a claves de traducción
  const nameToTranslationKey: Record<string, string> = {
    'masaje relajante': 'relaxing_massage',
    'masaje_relajante': 'relaxing_massage',
    'masaje descontracturante': 'therapeutic_massage',
    'masaje_descontracturante': 'therapeutic_massage',
    'reflexología podal': 'foot_reflexology',
    'reflexologia podal': 'foot_reflexology',
    'reflexologia_podal': 'foot_reflexology',
    'masaje deportivo': 'sports_massage',
    'masaje_deportivo': 'sports_massage',
    'masaje para dos personas': 'couples_massage',
    'masaje_para_dos_personas': 'couples_massage',
    'ritual romántico': 'romantic_ritual',
    'ritual_romantico': 'romantic_ritual',
    'ritual sakura': 'sakura_ritual',
    'ritual_sakura': 'sakura_ritual',
    'ritual del kobido': 'kobido_ritual',
    'ritual_del_kobido': 'kobido_ritual',
    'ritual energizante': 'energizing_ritual',
    'ritual_energizante': 'energizing_ritual',
    'ritual beauty': 'beauty_ritual',
    'ritual_beauty': 'beauty_ritual',
    'masaje con piedras calientes': 'hot_stones',
    'masaje_con_piedras_calientes': 'hot_stones',
    'bambuterapia': 'bamboo_therapy',
  };

  // Normalizar para matching (sin acentos)
  const normalizeForMatching = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  // Primero, buscar si el nombre exacto está en las traducciones
  const foundTranslationKey = findTranslationKeyByValue(serviceName);
  if (foundTranslationKey) {
    try {
      const translation = t(foundTranslationKey as any);
      if (translation && translation !== foundTranslationKey) {
        return translation;
      }
    } catch (error) {
      // Continuar con otros métodos
    }
  }

  // Normalizar el nombre para usar como clave de traducción
  const normalizedKey = serviceName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/'/g, '')
    .replace(/[^\w_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  // Intentar usar el sistema de traducciones con la clave normalizada
  try {
    const translation = t(normalizedKey as any);
    if (translation && translation !== normalizedKey) {
      return translation;
    }
  } catch (error) {
    // Si falla, continuar con otros métodos
  }
  
  // Buscar coincidencia exacta o parcial en el mapeo
  const serviceNameNormalized = normalizeForMatching(serviceName);
  let translationKey: string | null = null;

  // Buscar coincidencia exacta
  const exactMatch = Object.keys(nameToTranslationKey).find(key => normalizeForMatching(key) === serviceNameNormalized);
  if (exactMatch) {
    translationKey = nameToTranslationKey[exactMatch];
  } else {
    // Buscar coincidencia parcial
    for (const [key, value] of Object.entries(nameToTranslationKey)) {
      const keyNormalized = normalizeForMatching(key);
      if (serviceNameNormalized.includes(keyNormalized) || keyNormalized.includes(serviceNameNormalized)) {
        translationKey = value;
        break;
      }
    }
  }

  // Si encontramos una clave de traducción, usarla
  if (translationKey) {
    try {
      const translation = t(translationKey as any);
      if (translation && translation !== translationKey) {
        return translation;
      }
    } catch (error) {
      // Continuar con otros métodos
    }
  }

  // Mapeo directo de traducciones comunes como fallback
  const translationMap: Record<string, Record<string, string>> = {
    'masaje_relajante': {
      'en': 'Relaxing Massage',
      'fr': 'Massage Relaxant',
      'de': 'Entspannungsmassage',
      'it': 'Massaggio Rilassante',
      'pt': 'Massagem Relaxante',
      'zh': '放松按摩',
      'ar': 'تدليك الاسترخاء'
    },
    'masaje_descontracturante': {
      'en': 'Therapeutic Massage',
      'fr': 'Massage Thérapeutique',
      'de': 'Therapeutische Massage',
      'it': 'Massaggio Terapeutico',
      'pt': 'Massagem Terapêutica',
      'zh': '治疗按摩',
      'ar': 'تدليك علاجي'
    },
    'reflexologia_podal': {
      'en': 'Foot Reflexology',
      'fr': 'Réflexologie Plantaire',
      'de': 'Fußreflexzonenmassage',
      'it': 'Riflessologia Plantare',
      'pt': 'Reflexologia Plantar',
      'zh': '足部反射疗法',
      'ar': 'العلاج بالضغط على القدم'
    },
    'masaje_deportivo': {
      'en': 'Sports Massage',
      'fr': 'Massage Sportif',
      'de': 'Sportmassage',
      'it': 'Massaggio Sportivo',
      'pt': 'Massagem Desportiva',
      'zh': '运动按摩',
      'ar': 'تدليك رياضي'
    },
    'masaje_para_embarazada': {
      'en': 'Pregnancy Massage',
      'fr': 'Massage Prénatal',
      'de': 'Schwangerschaftsmassage',
      'it': 'Massaggio Prenatale',
      'pt': 'Massagem Pré-natal',
      'zh': '孕期按摩',
      'ar': 'تدليك الحمل'
    },
    'ritual_sakura': {
      'en': 'Sakura Ritual',
      'fr': 'Rituel Sakura',
      'de': 'Sakura-Ritual',
      'it': 'Rituale Sakura',
      'pt': 'Ritual Sakura',
      'zh': '樱花仪式',
      'ar': 'طقوس الساكورا'
    },
    'ritual_romantico': {
      'en': 'Romantic Ritual',
      'fr': 'Rituel Romantique',
      'de': 'Romantisches Ritual',
      'it': 'Rituale Romantico',
      'pt': 'Ritual Romântico',
      'zh': '浪漫仪式',
      'ar': 'طقوس رومانسية'
    },
    'masaje_cuatro_manos': {
      'en': 'Four Hands Massage',
      'fr': 'Massage à Quatre Mains',
      'de': 'Vier-Hände-Massage',
      'it': 'Massaggio a Quattro Mani',
      'pt': 'Massagem de Quatro Mãos',
      'zh': '四手按摩',
      'ar': 'تدليك بأربع أيدي'
    }
  };

  // Buscar en el mapeo
  const mapping = translationMap[normalizedKey];
  if (mapping && mapping[language as keyof typeof mapping]) {
    return mapping[language as keyof typeof mapping];
  }

  // Si no hay traducción, devolver el nombre original
  return serviceName;
};

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
    // Si estamos en el cliente (navegador)
    if (typeof window === 'undefined') {
      return 'es';
    }
    
    // Intentar obtener el idioma guardado
    const saved = localStorage.getItem('language');
    // Validar que el idioma guardado sea uno de los idiomas soportados
    const validLanguages: Language[] = ['es', 'en', 'fr', 'de', 'it', 'pt', 'zh', 'ar'];
    
    if (saved && validLanguages.includes(saved as Language)) {
      return saved as Language;
    }
    
    // Si no hay idioma guardado o no es válido, usar español por defecto
    // y guardarlo en localStorage inmediatamente
    localStorage.setItem('language', 'es');
    return 'es';
  });

  useEffect(() => {
    // Asegurar que siempre haya un idioma válido guardado
    const validLanguages: Language[] = ['es', 'en', 'fr', 'de', 'it', 'pt', 'zh', 'ar'];
    if (validLanguages.includes(language)) {
      localStorage.setItem('language', language);
    } else {
      // Si el idioma no es válido, resetear a español
      localStorage.setItem('language', 'es');
    }
  }, [language]);

  const t = (key: TranslationKey): string => {
    return (
      (translations as any)[language]?.[key] ||
      (translations as any).en?.[key] ||
      (translations as any).es?.[key] ||
      (key as string)
    );
  };

  return { language, setLanguage, t };
};
