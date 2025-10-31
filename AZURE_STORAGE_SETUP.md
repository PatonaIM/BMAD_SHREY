# Azure Blob Storage Setup Guide

This guide will walk you through setting up Azure Blob Storage for resume file storage.

## Step 1: Create Azure Storage Account

### Option A: Using Azure Portal (GUI)

1. **Sign in to Azure Portal**
   - Go to https://portal.azure.com
   - Sign in with your Microsoft account

2. **Create Storage Account**
   - Click "Create a resource"
   - Search for "Storage account"
   - Click "Create"

3. **Configure Storage Account**
   - **Subscription**: Select your Azure subscription
   - **Resource Group**: Create new or select existing (e.g., `bmad-resources`)
   - **Storage account name**: Enter unique name (e.g., `bmadresumes`)
     - Must be 3-24 characters, lowercase letters and numbers only
     - Must be globally unique across Azure
   - **Region**: Choose closest to your application (e.g., `East US`, `West Europe`)
   - **Performance**: Standard (sufficient for resumes)
   - **Redundancy**: LRS (Locally Redundant Storage) or ZRS for more durability
   - Click "Review + Create" then "Create"

4. **Create Blob Container**
   - After deployment, go to your storage account
   - In left menu, click "Containers" under "Data storage"
   - Click "+ Container"
   - **Name**: `resumes`
   - **Public access level**: Private (no anonymous access)
   - Click "Create"

5. **Get Connection String**
   - In your storage account, go to "Access keys" under "Security + networking"
   - Copy "Connection string" from key1 or key2
   - Keep this secure - you'll add it to your `.env` file

### Option B: Using Azure CLI (Command Line)

```bash
# Login to Azure
az login

# Create resource group (if needed)
az group create --name bmad-resources --location eastus

# Create storage account
az storage account create \
  --name bmadresumes \
  --resource-group bmad-resources \
  --location eastus \
  --sku Standard_LRS

# Get connection string
az storage account show-connection-string \
  --name bmadresumes \
  --resource-group bmad-resources \
  --output tsv

# Create container
az storage container create \
  --name resumes \
  --account-name bmadresumes \
  --auth-mode login
```

## Step 2: Install Azure SDK

```bash
npm install @azure/storage-blob
```

## Step 3: Add Environment Variables

Add to your `.env.local` file:

```env
# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=bmadresumes;AccountKey=YOUR_KEY_HERE;EndpointSuffix=core.windows.net"
AZURE_STORAGE_CONTAINER_NAME="resumes"

# Optional: Use Azure for storage (default is local filesystem)
USE_AZURE_STORAGE=true
```

**Important**:

- Never commit your connection string to git
- Add `.env.local` to `.gitignore` (already done)
- For production, use Azure Key Vault or environment variables in your hosting platform

## Step 4: Update Code

The implementation files have been created:

- `src/services/storage/azureBlobStorage.ts` - Azure Blob Storage implementation
- `src/services/storage/resumeStorage.ts` - Updated to support both local and Azure

## Step 5: Testing

### Test Locally with Azure

1. Set `USE_AZURE_STORAGE=true` in `.env.local`
2. Upload a resume through the application
3. Verify file appears in Azure Portal:
   - Go to your storage account
   - Click "Containers" → "resumes"
   - You should see uploaded files organized by userId

### Test Resume Upload

```bash
# Start your development server
npm run dev

# Navigate to http://localhost:3000/profile/resume
# Upload a test PDF/DOCX file
# Check Azure Portal to confirm upload
```

## Step 6: Deployment Configuration

### For Vercel/Production

Add environment variables in your hosting platform:

**Vercel**:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `AZURE_STORAGE_CONNECTION_STRING` = [your connection string]
   - `AZURE_STORAGE_CONTAINER_NAME` = `resumes`
   - `USE_AZURE_STORAGE` = `true`

**Other Platforms** (Azure App Service, AWS, etc.):

- Add the same environment variables through their respective configuration panels

## Storage Structure

Files are stored with the following structure:

```
resumes/
  └── [userId]/
      └── [timestamp]-[filename]
```

Example:

```
resumes/
  └── 507f1f77bcf86cd799439011/
      ├── 1730889600000-john_doe_resume.pdf
      └── 1730889700000-updated_resume.pdf
```

## Security Best Practices

1. **Connection String Security**
   - Never commit connection strings to source control
   - Use Azure Key Vault in production
   - Rotate access keys regularly (every 90 days)

2. **Container Access**
   - Keep container private (no anonymous access)
   - All file access goes through your authenticated API

3. **File Validation**
   - The system already validates file types (PDF, DOCX)
   - Max file size is enforced (10MB)
   - SHA256 checksums are stored for integrity

4. **CORS Configuration** (if serving files directly from Azure)
   ```bash
   az storage cors add \
     --services b \
     --methods GET HEAD \
     --origins https://yourdomain.com \
     --allowed-headers '*' \
     --exposed-headers '*' \
     --max-age 3600 \
     --account-name bmadresumes
   ```

## Cost Estimation

**Azure Blob Storage Pricing** (as of 2025, prices vary by region):

- Storage: ~$0.02 per GB/month (LRS)
- Operations:
  - Write: ~$0.05 per 10,000 operations
  - Read: ~$0.004 per 10,000 operations

**Example**:

- 1000 users, 1 resume each (2MB average) = 2GB = $0.04/month
- 10,000 uploads/month = $0.05
- 50,000 views/month = $0.02

**Total: ~$0.11/month for small-medium usage**

## Monitoring

### Check Storage Usage

```bash
# Check storage account usage
az storage account show-usage \
  --name bmadresumes \
  --resource-group bmad-resources

# List all blobs in container
az storage blob list \
  --container-name resumes \
  --account-name bmadresumes \
  --output table
```

### Azure Portal Monitoring

1. Go to your storage account
2. Click "Metrics" under "Monitoring"
3. Add metrics:
   - Ingress (uploads)
   - Egress (downloads)
   - Transactions
   - Used Capacity

## Troubleshooting

### Issue: "Connection string is invalid"

- Verify connection string format
- Check for extra spaces or quotes
- Ensure AccountKey is correct

### Issue: "Container not found"

- Verify container name matches `AZURE_STORAGE_CONTAINER_NAME`
- Check container exists in Azure Portal
- Ensure container name is lowercase

### Issue: "Authorization failure"

- Check connection string has correct AccountKey
- Verify storage account access keys are not disabled
- Check firewall rules if restricted

### Issue: Files not appearing in Azure

- Check `USE_AZURE_STORAGE=true` is set
- Verify environment variables are loaded
- Check application logs for upload errors
- Test connection with Azure Storage Explorer

## Migration from Local to Azure

If you have existing local files to migrate:

```bash
# Install Azure CLI (if not already installed)
# macOS: brew install azure-cli
# Windows: Download from https://aka.ms/installazurecliwindows

# Login
az login

# Upload directory recursively
az storage blob upload-batch \
  --destination resumes \
  --source ./data/resumes \
  --account-name bmadresumes \
  --auth-mode login
```

## Rollback Plan

If you need to switch back to local storage:

1. Set `USE_AZURE_STORAGE=false` in `.env.local`
2. Restart application
3. New uploads will use local filesystem
4. Existing Azure files remain accessible until you migrate them back

## Additional Resources

- [Azure Blob Storage Documentation](https://learn.microsoft.com/en-us/azure/storage/blobs/)
- [Azure SDK for JavaScript](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/storage/storage-blob)
- [Azure Storage Explorer](https://azure.microsoft.com/en-us/products/storage/storage-explorer/) - GUI tool for managing storage
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)

## Support

If you encounter issues:

1. Check application logs
2. Verify environment variables
3. Test connection with Azure Storage Explorer
4. Check Azure Portal for service health
5. Review Azure Storage metrics for errors
