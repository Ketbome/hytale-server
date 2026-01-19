import './app.css';
import { initI18n } from '$lib/i18n';
import { mount } from 'svelte';
import App from './App.svelte';

async function bootstrap() {
  await initI18n();

  mount(App, {
    target: document.getElementById('app')!
  });
}

bootstrap();
