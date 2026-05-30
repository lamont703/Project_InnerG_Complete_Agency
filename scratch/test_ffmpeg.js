const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

const inputFile = path.join(__dirname, '../public/videos/sauccy_fades.mp4');
const outputFile = path.join(__dirname, '../public/videos/sauccy_fades_overlay.mp4');

// Since this is a Mac, we can rely on Helvetica being present
const fontFile = '/System/Library/Fonts/Avenir Next.ttc';

console.log('🎬 Starting FFmpeg overlay generation...');

ffmpeg(inputFile)
  .videoFilters([
    {
      filter: 'drawtext',
      options: {
        fontfile: fontFile,
        text: 'Sauccy Fades Barbershop',
        fontcolor: 'white',
        fontsize: 50,
        box: 1,
        boxcolor: 'black@0.6',
        boxborderw: 15,
        x: '(w-text_w)/2',
        y: '(h-text_h)/2 - 200'
      }
    },
    {
      filter: 'drawtext',
      options: {
        fontfile: fontFile,
        text: 'Dallas, TX • 5.0 Stars (517 Reviews)',
        fontcolor: '#FFD700',
        fontsize: 32,
        box: 1,
        boxcolor: 'black@0.6',
        boxborderw: 15,
        x: '(w-text_w)/2',
        y: '(h-text_h)/2 - 80'
      }
    },
    {
      filter: 'drawtext',
      options: {
        fontfile: fontFile,
        text: 'Booth Rent - $225/chair',
        fontcolor: 'white',
        fontsize: 48,
        box: 1,
        boxcolor: 'black@0.6',
        boxborderw: 15,
        x: '(w-text_w)/2',
        y: '(h-text_h)/2 + 80'
      }
    },
    {
      filter: 'drawtext',
      options: {
        fontfile: fontFile,
        text: '2 Chairs Available',
        fontcolor: 'white',
        fontsize: 48,
        box: 1,
        boxcolor: 'black@0.6',
        boxborderw: 15,
        x: '(w-text_w)/2',
        y: '(h-text_h)/2 + 200'
      }
    }
  ])
  .outputOptions('-y')
  .output(outputFile)
  .on('end', () => console.log(`✅ Success! Video saved to ${outputFile}`))
  .on('error', (err, stdout, stderr) => console.error('❌ Error rendering video:', err, stderr))
  .run();
