import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationToProcess {
  id: string
  client_id: string
  message_content: string
  subject?: string
  send_via: string[]
  client_email?: string
  client_phone?: string
  client_name?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 Starting notification processing...')

    // 1. Get pending notifications that should be sent
    const now = new Date().toISOString()
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from('scheduled_notifications')
      .select(`
        id,
        client_id,
        message_content,
        subject,
        send_via,
        scheduled_for
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(50)

    if (fetchError) {
      console.error('❌ Error fetching notifications:', fetchError)
      throw fetchError
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('✅ No pending notifications to process')
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📧 Found ${pendingNotifications.length} notifications to process`)

    // 2. Get client details for each notification
    const clientIds = [...new Set(pendingNotifications.map(n => n.client_id))]
    const { data: clients, error: clientError } = await supabaseClient
      .from('profiles')
      .select('id, email, phone, first_name, last_name')
      .in('id', clientIds)

    if (clientError) {
      console.error('❌ Error fetching client data:', clientError)
      throw clientError
    }

    const clientMap = new Map(clients?.map(c => [c.id, c]) || [])

    // 3. Process each notification
    const processedResults = []
    
    for (const notification of pendingNotifications) {
      const client = clientMap.get(notification.client_id)
      
      if (!client) {
        console.warn(`⚠️ Client not found for notification ${notification.id}`)
        await supabaseClient
          .from('scheduled_notifications')
          .update({ 
            status: 'failed', 
            error_message: 'Client not found',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id)
        continue
      }

      const notificationWithClient: NotificationToProcess = {
        ...notification,
        client_email: client.email,
        client_phone: client.phone,
        client_name: `${client.first_name || ''} ${client.last_name || ''}`.trim()
      }

      try {
        let success = false
        let errorMessage = ''

        // Process message template variables
        const processedMessage = processMessageTemplate(notification.message_content, {
          client_name: notificationWithClient.client_name,
          client_email: client.email,
          client_phone: client.phone || '',
          date: new Date().toLocaleDateString('es-ES'),
          time: new Date().toLocaleTimeString('es-ES')
        })

        // Send via different channels
        for (const channel of notification.send_via) {
          try {
            switch (channel) {
              case 'email':
                if (client.email) {
                  await sendEmail(notificationWithClient, processedMessage)
                  success = true
                }
                break
              case 'sms':
                if (client.phone) {
                  await sendSMS(notificationWithClient, processedMessage)
                  success = true
                }
                break
              case 'in_app':
                await createInAppNotification(notificationWithClient, processedMessage)
                success = true
                break
            }
          } catch (channelError) {
            console.error(`❌ Error sending via ${channel}:`, channelError)
            errorMessage += `${channel}: ${channelError.message}; `
          }
        }

        // Update notification status
        const updateData = {
          status: success ? 'sent' : 'failed',
          sent_at: new Date().toISOString(),
          ...(errorMessage && { error_message: errorMessage.trim() })
        }

        await supabaseClient
          .from('scheduled_notifications')
          .update(updateData)
          .eq('id', notification.id)

        processedResults.push({
          id: notification.id,
          success,
          error: errorMessage || null
        })

        console.log(`${success ? '✅' : '❌'} Processed notification ${notification.id} for ${notificationWithClient.client_name}`)

      } catch (error) {
        console.error(`❌ Error processing notification ${notification.id}:`, error)
        
        await supabaseClient
          .from('scheduled_notifications')
          .update({ 
            status: 'failed', 
            error_message: error.message,
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        processedResults.push({
          id: notification.id,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = processedResults.filter(r => r.success).length
    console.log(`🎉 Processing complete: ${successCount}/${pendingNotifications.length} successful`)

    return new Response(
      JSON.stringify({ 
        message: 'Notifications processed', 
        processed: pendingNotifications.length,
        successful: successCount,
        results: processedResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Fatal error in process-notifications:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper functions
function processMessageTemplate(template: string, variables: Record<string, string>): string {
  let processed = template
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    processed = processed.replace(regex, value || '')
  }
  
  return processed
}

async function sendEmail(notification: NotificationToProcess, message: string) {
  // For demo purposes - integrate with your email service (SendGrid, Resend, etc.)
  console.log(`📧 Sending email to ${notification.client_email}: ${message}`)
  
  // Example integration with Resend (commented out)
  /*
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@yourdomain.com',
      to: notification.client_email,
      subject: notification.subject || 'Notificación',
      html: message
    })
  })
  
  if (!response.ok) {
    throw new Error(`Email service error: ${response.statusText}`)
  }
  */
}

async function sendSMS(notification: NotificationToProcess, message: string) {
  // For demo purposes - integrate with your SMS service (Twilio, etc.)
  console.log(`📱 Sending SMS to ${notification.client_phone}: ${message}`)
  
  // Example integration with Twilio (commented out)
  /*
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')
  
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      From: fromNumber,
      To: notification.client_phone,
      Body: message
    })
  })
  
  if (!response.ok) {
    throw new Error(`SMS service error: ${response.statusText}`)
  }
  */
}

async function createInAppNotification(notification: NotificationToProcess, message: string) {
  console.log(`🔔 Creating in-app notification for ${notification.client_name}: ${message}`)
  
  // Here you could create an in-app notification record
  // or trigger a real-time notification via Supabase channels
}