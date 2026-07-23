const fs = require('fs');
const path = require('path');

// Look for any .json file in the current directory that contains service account keys
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.json') && f !== 'package.json' && f !== 'package-lock.json' && f !== '.oxlintrc.json');

if (files.length === 0) {
  console.log('\n❌ No service account JSON file found in this folder!');
  console.log('👉 Please copy your downloaded Google service account JSON file into: d:\\Projects\\ForLab\\');
  console.log('   and name it service-account.json\n');
  process.exit(1);
}

const keyFilePath = path.join(__dirname, files[0]);
console.log(`\n🔍 Found key file: ${files[0]}`);

try {
  const keyData = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));

  if (!keyData.client_email || !keyData.private_key) {
    console.log('❌ Invalid JSON file: missing client_email or private_key.');
    process.exit(1);
  }

  const base64PrivateKey = Buffer.from(keyData.private_key).toString('base64');

  const envContent = `# ForLab Environment Variables

MASTER_KEY=surya2026

GOOGLE_SERVICE_ACCOUNT_EMAIL=${keyData.client_email}
GOOGLE_PRIVATE_KEY=${base64PrivateKey}
GOOGLE_DRIVE_FOLDER_ID=paste_your_google_drive_folder_id_here
`;

  fs.writeFileSync(path.join(__dirname, '.env'), envContent);

  console.log('\n✅ SUCCESS! Created d:\\Projects\\ForLab\\.env file automatically!');
  console.log('--------------------------------------------------');
  console.log('📧 Service Account Email:', keyData.client_email);
  console.log('🔐 Private Key: Successfully converted to Base64 (single line)');
  console.log('--------------------------------------------------');
  console.log('\n👉 Final Step: Open .env and replace "paste_your_google_drive_folder_id_here"');
  console.log('   with your actual Google Drive Folder ID!\n');

} catch (err) {
  console.error('❌ Error reading key file:', err.message);
}
