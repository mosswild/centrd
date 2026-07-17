import JSZip from 'jszip';
import { addThrowLog, updateThrowLog, saveSettings, uploadThrowPhoto } from '../db';

export async function importChallengeFromZip(zipFile, activeUserId, onProgress) {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);
  
  const backupJsonFile = loadedZip.file("centrd_backup_data.json");
  if (!backupJsonFile) {
    throw new Error("Invalid ZIP file: Missing 'centrd_backup_data.json' backup metadata.");
  }
  
  const backupJsonText = await backupJsonFile.async("text");
  const backupData = JSON.parse(backupJsonText);
  
  const { settings, throws } = backupData;
  if (!settings || !throws) {
    throw new Error("Invalid backup schema inside JSON file.");
  }
  
  // 1. Save settings under current active potter profile
  const importedSettings = {
    ...settings,
    userId: activeUserId
  };
  await saveSettings(activeUserId, importedSettings);
  
  const total = throws.length;
  let importedCount = 0;
  
  // Sort throws chronologically so they are added in order
  const sortedThrows = [...throws].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  for (let i = 0; i < sortedThrows.length; i++) {
    const t = sortedThrows[i];
    
    // Construct base throw object
    const throwData = {
      weightClass: t.weightClass,
      weightValue: t.weightValue,
      status: t.status || 'Successful',
      dateThrown: t.dateThrown,
      notes: t.notes || "",
      photos: [] // photos will be uploaded and updated separately
    };
    
    // Add throw entry to get a new ID
    const newThrowId = await addThrowLog(activeUserId, throwData);
    
    // Upload associated photos from ZIP
    const uploadedPhotos = [];
    if (t.photos && t.photos.length > 0) {
      for (const photo of t.photos) {
        if (photo.zipPath) {
          const zipImageFile = loadedZip.file(photo.zipPath);
          if (zipImageFile) {
            const imageBlob = await zipImageFile.async("blob");
            const filename = photo.zipPath.split('/').pop() || 'photo.jpg';
            const fileType = imageBlob.type || "image/jpeg";
            const fileObj = new File([imageBlob], filename, { type: fileType });
            
            try {
              // Upload photo to backend server or local storage
              const uploadedPhotoObj = await uploadThrowPhoto(activeUserId, newThrowId, fileObj, photo.stage);
              uploadedPhotos.push(uploadedPhotoObj);
            } catch (err) {
              console.error(`Failed to upload photo for throw #${i + 1} stage ${photo.stage}:`, err);
            }
          }
        }
      }
    }
    
    // If photos were successfully uploaded, update the record
    if (uploadedPhotos.length > 0) {
      await updateThrowLog(newThrowId, {
        photos: uploadedPhotos
      });
    }
    
    importedCount++;
    if (onProgress) {
      onProgress(importedCount, total);
    }
  }
  
  return { importedCount };
}
