# Quick Start: Testing Azure Storage

## Prerequisites

- ✅ Azure SDK installed (`@azure/storage-blob`)
- ✅ Code implementation complete
- ✅ Build successful

## Setup Steps

### 1. Create Azure Storage Account

**Option A: Azure Portal (5 minutes)**

1. Go to https://portal.azure.com
2. Click "Create a resource" → Search "Storage account"
3. Fill in:
   - Resource group: Create new "bmad-resources"
   - Storage account name: "bmadresumes" (must be globally unique)
   - Region: East US (or closest to you)
   - Performance: Standard
   - Redundancy: LRS (Locally-redundant storage)
4. Click "Review + Create" → "Create"
5. Wait 1-2 minutes for deployment
6. Go to resource → "Access keys" → Copy "Connection string"
7. Go to "Containers" → "+ Container" → Name: "resumes", Access: Private

**Option B: Azure CLI (2 minutes)**

```bash
# Install Azure CLI
brew install azure-cli

# Login
az login

# Create everything
az group create --name bmad-resources --location eastus

az storage account create \
  --name bmadresumes \
  --resource-group bmad-resources \
  --location eastus \
  --sku Standard_LRS

# Get connection string (save this!)
az storage account show-connection-string \
  --name bmadresumes \
  --resource-group bmad-resources \
  --output tsv

# Create container
az storage container create \
  --name resumes \
  --account-name bmadresumes \
  --public-access off
```

### 2. Configure Environment

```bash
# Create .env.local
cat > .env.local << 'EOF'
USE_AZURE_STORAGE=true
AZURE_STORAGE_CONNECTION_STRING="<PASTE YOUR CONNECTION STRING HERE>"
AZURE_STORAGE_CONTAINER_NAME=resumes
EOF

# Example connection string format:
# DefaultEndpointsProtocol=https;AccountName=bmadresumes;AccountKey=abc123...xyz789==;EndpointSuffix=core.windows.net
```

### 3. Start Development Server

```bash
npm run dev
```

**Expected log output:**

```json
{
  "level": 30,
  "event": "storage_initialized",
  "provider": "azure",
  "container": "resumes"
}
```

If you see this instead, check your connection string:

```json
{
  "level": 40,
  "event": "storage_config_warn",
  "message": "USE_AZURE_STORAGE is true but AZURE_STORAGE_CONNECTION_STRING is not set..."
}
```

### 4. Test Upload

1. Navigate to http://localhost:3000/profile/resume
2. Click "Upload Resume"
3. Select a PDF or DOCX file
4. Wait for upload to complete

**Verify in Azure Portal:**

1. Go to Storage Account → Containers → resumes
2. You should see a folder with your userId
3. Click folder → see file: `{timestamp}-{filename}.pdf`
4. Click file → Properties → Metadata
5. Verify metadata:
   - `userid`: Your user ID
   - `originalfilename`: Original file name
   - `sha256`: File hash
   - `uploadedat`: ISO timestamp

### 5. Test Download

1. Go to http://localhost:3000/profile/edit
2. Profile should load with resume data
3. If you see "Failed to load profile", check browser console for errors

## Troubleshooting

### ❌ Error: "Cannot connect to Azure storage"

**Check:**

```bash
# Verify connection string format
echo $AZURE_STORAGE_CONNECTION_STRING

# Test connection
az storage account show \
  --name bmadresumes \
  --resource-group bmad-resources
```

### ❌ Error: "Container not found"

**Create container:**

```bash
az storage container create \
  --name resumes \
  --account-name bmadresumes
```

### ❌ Files not appearing in Azure

**Debug steps:**

1. Check application logs for "storage_initialized" with provider="azure"
2. Verify .env.local is loaded: `console.log(process.env.USE_AZURE_STORAGE)`
3. Restart dev server after changing .env.local
4. Check Azure Portal → Storage Account → Monitoring → Metrics

### ❌ Error: "Authorization permission mismatch"

**Solution:** Regenerate access key

1. Azure Portal → Storage Account → Access keys
2. Click "Regenerate" on key1
3. Copy new connection string
4. Update .env.local
5. Restart server

## Test Checklist

- [ ] Azure storage account created
- [ ] Container "resumes" created with private access
- [ ] Connection string copied
- [ ] .env.local configured
- [ ] Dev server shows "storage_initialized" with provider="azure"
- [ ] Upload PDF resume successfully
- [ ] File appears in Azure Portal under correct path
- [ ] Metadata contains userId, sha256, uploadedAt
- [ ] Profile edit page loads resume data
- [ ] Download resume works correctly

## Cost Monitoring

After testing, check costs:

```bash
# View storage metrics
az monitor metrics list \
  --resource /subscriptions/{sub-id}/resourceGroups/bmad-resources/providers/Microsoft.Storage/storageAccounts/bmadresumes \
  --metric "UsedCapacity"
```

Expected test costs: < $0.01 (minimal usage)

## Cleanup (Optional)

To remove Azure resources after testing:

```bash
# Delete entire resource group
az group delete --name bmad-resources --yes

# This deletes:
# - Storage account
# - All containers
# - All files
```

Or keep it running for production (~$0.11/month).

## Next: Production Deployment

Once testing succeeds locally, see `AZURE_MIGRATION_SUMMARY.md` for production deployment steps.
