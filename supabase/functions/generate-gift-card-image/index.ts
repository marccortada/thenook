import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { code, amount, purchaseDate, recipientName, purchaserName } = await req.json();

    // Formatear la fecha
    const formattedDate = new Date(purchaseDate).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Generar SVG personalizado para gift card
    const giftCardSvg = `
      <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffecd2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fcb69f;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Fondo -->
        <rect width="600" height="400" fill="url(#bgGradient)" rx="20" />
        
        <!-- Tarjeta principal -->
        <rect x="50" y="50" width="500" height="300" fill="url(#cardGradient)" rx="15" stroke="#fff" stroke-width="2" />
        
        <!-- Título -->
        <text x="300" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#333">
          TARJETA REGALO
        </text>
        
        <!-- Subtítulo -->
        <text x="300" y="130" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#555">
          The Nook Madrid
        </text>
        
        <!-- Cantidad -->
        <text x="300" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#2d5016">
          €${(amount / 100).toFixed(2)}
        </text>
        
        <!-- Código -->
        <rect x="150" y="210" width="300" height="40" fill="#fff" rx="5" stroke="#ddd" stroke-width="1" />
        <text x="300" y="235" text-anchor="middle" font-family="monospace" font-size="20" font-weight="bold" fill="#333">
          ${code}
        </text>
        
        <!-- Fecha de compra -->
        <text x="100" y="280" font-family="Arial, sans-serif" font-size="14" fill="#555">
          Fecha de compra: ${formattedDate}
        </text>
        
        <!-- Para -->
        ${recipientName ? `
        <text x="100" y="300" font-family="Arial, sans-serif" font-size="14" fill="#555">
          Para: ${recipientName}
        </text>
        ` : ''}
        
        <!-- De -->
        ${purchaserName ? `
        <text x="100" y="320" font-family="Arial, sans-serif" font-size="14" fill="#555">
          De: ${purchaserName}
        </text>
        ` : ''}
        
        <!-- Decoración -->
        <circle cx="500" cy="100" r="30" fill="#fff" opacity="0.2" />
        <circle cx="480" cy="80" r="15" fill="#fff" opacity="0.3" />
        <circle cx="520" cy="120" r="10" fill="#fff" opacity="0.4" />
      </svg>
    `;

    // Convertir SVG a base64
    const base64Svg = btoa(giftCardSvg);
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

    // También guardar en storage si es necesario
    const fileName = `gift-card-${code}.svg`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('gift-cards')
      .upload(fileName, giftCardSvg, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError);
    }

    const publicUrl = uploadData ? 
      supabase.storage.from('gift-cards').getPublicUrl(fileName).data.publicUrl : 
      null;

    return new Response(JSON.stringify({
      success: true,
      imageData: dataUrl,
      publicUrl: publicUrl,
      code: code,
      amount: amount,
      purchaseDate: formattedDate
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating gift card:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});