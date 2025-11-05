-- Create storage bucket for gift card images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gift-cards', 'gift-cards', true);

-- Create storage policies for gift card images
CREATE POLICY "Gift card images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gift-cards');

CREATE POLICY "System can upload gift card images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'gift-cards');

CREATE POLICY "System can update gift card images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'gift-cards');

CREATE POLICY "System can delete gift card images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'gift-cards');