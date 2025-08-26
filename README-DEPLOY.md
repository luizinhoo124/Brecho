# Deploy Manual para Vercel - EcoFashion

Este guia fornece instruções passo a passo para fazer o deploy do projeto EcoFashion na Vercel.

## Pré-requisitos

1. Conta na Vercel (https://vercel.com)
2. Vercel CLI instalado globalmente: `npm install -g vercel`
3. Git configurado no projeto

## Preparação do Projeto

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure as variáveis:

```bash
cp .env.example .env
```

**Variáveis obrigatórias para produção:**
- `JWT_SECRET`: Chave secreta para JWT (mínimo 32 caracteres)
- `JWT_REFRESH_SECRET`: Chave secreta para refresh token
- `SESSION_SECRET`: Chave secreta para sessões
- `ENCRYPTION_KEY`: Chave de criptografia (32 caracteres)
- `CORS_ORIGIN`: Domínio da sua aplicação na Vercel
- `API_BASE_URL`: URL base da API na Vercel
- `FRONTEND_URL`: URL do frontend na Vercel

### 3. Build do Projeto
```bash
npm run build
```

## Deploy via Vercel CLI

### 1. Login na Vercel
```bash
vercel login
```

### 2. Deploy Inicial
```bash
vercel
```

Siga as instruções:
- Confirme o diretório do projeto
- Escolha seu escopo (pessoal ou team)
- Confirme o nome do projeto
- Confirme o diretório raiz (deixe vazio)
- Não modifique as configurações de build

### 3. Configurar Variáveis de Ambiente na Vercel

Após o primeiro deploy, configure as variáveis de ambiente:

```bash
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET
vercel env add SESSION_SECRET
vercel env add ENCRYPTION_KEY
vercel env add NODE_ENV
vercel env add CORS_ORIGIN
vercel env add API_BASE_URL
vercel env add FRONTEND_URL
```

Ou configure via dashboard da Vercel:
1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em Settings > Environment Variables
4. Adicione todas as variáveis do `.env.example`

### 4. Deploy de Produção
```bash
vercel --prod
```

## Deploy via Dashboard da Vercel

### 1. Conectar Repositório
1. Acesse https://vercel.com/dashboard
2. Clique em "New Project"
3. Conecte seu repositório Git
4. Selecione o repositório do EcoFashion

### 2. Configurar Build
- **Framework Preset**: Other
- **Root Directory**: ./
- **Build Command**: `npm run build`
- **Output Directory**: dist
- **Install Command**: `npm install`

### 3. Configurar Variáveis de Ambiente
Adicione todas as variáveis do `.env.example` na seção Environment Variables.

### 4. Deploy
Clique em "Deploy" e aguarde o processo.

## Configurações Importantes

### Arquivo vercel.json
O projeto já possui um `vercel.json` configurado:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.ts"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Estrutura de Arquivos
- `api/index.ts`: Entry point para serverless functions
- `api/app.ts`: Aplicação Express principal
- `vercel.json`: Configurações de deploy
- `tsconfig.json`: Configurações TypeScript

## Limitações da Vercel

1. **Banco de Dados**: SQLite não persiste entre execuções. Considere migrar para:
   - Vercel Postgres
   - PlanetScale
   - Supabase
   - MongoDB Atlas

2. **Uploads**: Arquivos não persistem. Use:
   - Vercel Blob
   - Cloudinary
   - AWS S3

3. **Logs**: Use serviços externos como:
   - Vercel Analytics
   - LogRocket
   - Sentry

## Verificação do Deploy

### 1. Testar Endpoints
```bash
# Health check
curl https://seu-dominio.vercel.app/api/health

# Listar produtos
curl https://seu-dominio.vercel.app/api/products
```

### 2. Verificar Logs
```bash
vercel logs
```

### 3. Monitorar Performance
Acesse o dashboard da Vercel para monitorar:
- Tempo de resposta
- Erros
- Uso de recursos

## Troubleshooting

### Erro de Build
1. Verifique se todas as dependências estão instaladas
2. Execute `npm run build` localmente
3. Verifique o `tsconfig.json`

### Erro de Runtime
1. Verifique as variáveis de ambiente
2. Analise os logs: `vercel logs`
3. Teste localmente com `NODE_ENV=production`

### Erro de CORS
1. Configure `CORS_ORIGIN` com o domínio correto
2. Verifique se o frontend está fazendo requisições para a URL correta

## Comandos Úteis

```bash
# Ver informações do projeto
vercel ls

# Ver logs em tempo real
vercel logs --follow

# Remover deployment
vercel rm [deployment-url]

# Ver domínios
vercel domains

# Adicionar domínio customizado
vercel domains add [domain]
```

## Próximos Passos

1. **Configurar Domínio Customizado**
2. **Migrar para Banco de Dados Persistente**
3. **Configurar CDN para Uploads**
4. **Implementar Monitoramento**
5. **Configurar CI/CD**

---

**Nota**: Este projeto está configurado para deploy serverless na Vercel. Para outras plataformas, ajustes podem ser necessários.