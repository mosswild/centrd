import JSZip from 'jszip';

// Helper to convert base64 DataURL or remote URL to binary data for the ZIP archive
async function getImageData(url) {
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const binary = atob(parts[1]);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { data: bytes, extension: mime.split('/')[1] || 'jpg' };
  } else {
    // Fetch remote image binary (e.g. from Firebase Storage)
    const response = await fetch(url);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return { data: new Uint8Array(arrayBuffer), extension: blob.type.split('/')[1] || 'jpg' };
  }
}

export async function exportChallengeToZip(throws, settings) {
  const zip = new JSZip();
  const imgFolder = zip.folder("images");
  
  const totalThrows = throws.length;
  const targetCylinders = settings.targetCylinders || 200;
  const successCount = throws.filter(t => t.status === 'Successful').length;
  const successRate = totalThrows > 0 ? Math.round((successCount / totalThrows) * 100) : 0;

  // 1. Generate challenge_log.md content
  let md = `# Centrd: A Throwing Diary\n\n`;
  md += `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;

  md += `## Challenge Overview\n`;
  md += `- **Cylinder Target:** ${targetCylinders} cylinders\n`;
  md += `- **Total Logged Throws:** ${totalThrows} (${Math.min(100, Math.round((totalThrows/targetCylinders)*100))}% complete)\n`;
  md += `- **Successful/Kept:** ${successCount} (${successRate}% success rate)\n`;
  
  if (settings.hasTimeLimit) {
    md += `- **Timeline:** ${new Date(settings.startDate + 'T00:00:00').toLocaleDateString()} to ${new Date(settings.endDate + 'T00:00:00').toLocaleDateString()}\n`;
  } else {
    md += `- **Timeline:** Open (no schedule deadline)\n`;
  }
  md += `\n`;

  md += `## Weight Class Status\n`;
  settings.weightCategories.forEach(cat => {
    const catThrows = throws.filter(t => t.weightClass === cat.id);
    const count = catThrows.length;
    const success = catThrows.filter(t => t.status === 'Successful').length;
    md += `- **${cat.name} (${cat.weight} ${cat.unit}):** ${count} / ${cat.targetCount} thrown (${success} successful)\n`;
  });
  md += `\n`;

  md += `## Timeline Table\n\n`;
  md += `| Index | Date | Weight Class | Quality/Status | Notes | Photos |\n`;
  md += `| --- | --- | --- | --- | --- | --- |\n`;

  // Sort throws chronologically for export
  const chronologicalThrows = [...throws].sort((a, b) => new Date(a.dateThrown) - new Date(b.dateThrown));

  chronologicalThrows.forEach((t, index) => {
    const category = settings.weightCategories.find(c => c.id === t.weightClass) || { name: t.weightClass };
    const actualWeight = t.weightValue !== undefined ? `${t.weightValue} ${settings.globalUnit || 'lb'}` : `${category.weight || ''} ${settings.globalUnit || 'lb'}`;
    const notesCell = t.notes ? t.notes.replace(/\n/g, ' ') : '';
    const photoCount = t.photos ? t.photos.length : 0;
    md += `| ${index + 1} | ${t.dateThrown} | ${category.name} (${actualWeight}) | ${t.status || 'Successful'} | ${notesCell} | ${photoCount} photos |\n`;
  });
  md += `\n\n---\n\n`;

  md += `## Log Entries Detail\n\n`;

  // 2. Fetch and package images, link them in MD
  for (let index = 0; index < chronologicalThrows.length; index++) {
    const t = chronologicalThrows[index];
    const category = settings.weightCategories.find(c => c.id === t.weightClass) || { name: t.weightClass };
    const actualWeight = t.weightValue !== undefined ? `${t.weightValue} ${settings.globalUnit || 'lb'}` : `${category.weight || ''} ${settings.globalUnit || 'lb'}`;
    
    md += `### Cylinder #${index + 1} - ${t.dateThrown}\n`;
    md += `- **Weight Class:** ${category.name}\n`;
    md += `- **Logged Weight:** ${actualWeight}\n`;
    md += `- **Quality/Status:** ${t.status || 'Successful'}\n`;
    md += `- **Notes:** ${t.notes || '*No notes recorded.*'}\n\n`;

    if (t.photos && t.photos.length > 0) {
      md += `#### Photos\n\n`;
      for (let pIdx = 0; pIdx < t.photos.length; pIdx++) {
        const photo = t.photos[pIdx];
        const sanitizedStage = photo.stage.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const filename = `throw_${index + 1}_stage_${sanitizedStage}_${photo.id || pIdx}`;
        
        try {
          // Download or extract image bytes
          const { data, extension } = await getImageData(photo.url);
          const fullFilename = `${filename}.${extension}`;
          
          // Write to ZIP
          imgFolder.file(fullFilename, data);
          
          // Embed in MD
          md += `**Stage: ${photo.stage}**\n`;
          md += `![${photo.stage} Image](images/${fullFilename})\n\n`;
        } catch (err) {
          console.error(`Failed to package image for throw #${index + 1} stage ${photo.stage}`, err);
          // Fallback to remote URL in markdown
          md += `**Stage: ${photo.stage}** (Image package failed, embedding cloud link)\n`;
          md += `![${photo.stage} Image](${photo.url})\n\n`;
        }
      }
    } else {
      md += `*No photos logged for this cylinder.*\n\n`;
    }
    
    md += `---\n\n`;
  }

  // 3. Save Markdown to ZIP
  zip.file("challenge_log.md", md);

  // 4. Generate and download ZIP file
  const content = await zip.generateAsync({ type: "blob" });
  const downloadUrl = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = "throwing_challenge_log.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
