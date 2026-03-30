

# Plano: Armazenar QR Code e Imagem de Perfil do WhatsApp

## Contexto
A tabela `whatsapp_instances` já possui a coluna `qr_code` (text) que armazena o QR code base64. O que falta é capturar e armazenar a **foto de perfil** do WhatsApp conectado.

## Alterações

### 1. Migração — adicionar coluna `profile_pic_url`
```sql
ALTER TABLE public.whatsapp_instances ADD COLUMN profile_pic_url text;
```
Armazenará a URL ou base64 da foto de perfil do WhatsApp conectado.

### 2. Edge Function `evolution-api/index.ts`
- No case `connect`: quando a instância já está conectada (`alreadyConnected`), buscar a foto de perfil via Evolution API (`/chat/fetchProfilePictureUrl/{instanceName}`) e salvar no campo `profile_pic_url`.
- No case `status`: quando status muda para `connected`, buscar a foto de perfil e salvar.
- Criar helper interno `fetchProfilePic(baseUrl, headers, instanceName, phoneNumber)` que chama o endpoint da Evolution API para obter a imagem.

### 3. Frontend `WhatsAppTab.tsx`
- Exibir a foto de perfil do WhatsApp no card da instância (ao lado do nome) quando `profile_pic_url` estiver disponível.
- Fallback para ícone genérico quando não houver imagem.

### Fluxo
```text
Instância conecta → status=connected → busca profilePicUrl via Evolution API → salva no DB → exibe no card
```

