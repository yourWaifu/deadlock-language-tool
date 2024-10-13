const projectId = 'ai-language-translation';
const location = 'global';
const text = 'This is a sample of all <var id="feature_count"></var> features.<br><br/><esc char="n"></esc><span class="bold">Only allow if <var id="name"></var> is intact.</span>';

// Imports the Google Cloud Translation library
import {TranslationServiceClient} from '@google-cloud/translate';

// Instantiates a client
const translationClient = new TranslationServiceClient();

async function translateText() {
  // Construct request
  const request = {
    parent: `projects/${projectId}/locations/${location}`,
    contents: [text],
    mimeType: 'text/html', // mime types: text/plain, text/html
    sourceLanguageCode: 'en',
    targetLanguageCode: 'yue',
  };

  // Run request
  const [response] = await translationClient.translateText(request);

  for (const translation of response.translations) {
    console.log(`Translation: ${translation.translatedText}`);
  }
}

translateText();