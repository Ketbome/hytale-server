import { defineConfig } from 'vitepress'

const siteUrl = 'https://hytalepanel.ketbome.com'
const title = 'HytalePanel'
const description = {
  en: 'Docker image for Hytale dedicated server with web admin panel, auto-download, JWT authentication, file manager, and mod support.',
  es: 'Imagen Docker para servidor dedicado de Hytale con panel web, descarga automática, autenticación JWT, gestor de archivos y soporte de mods.',
  uk: 'Docker образ для виділеного сервера Hytale з веб-панеллю, автозавантаженням, JWT автентифікацією, файловим менеджером та підтримкою модів.'
}

// Shared sidebar structure
const guideSidebar = (lang: string) => [
  {
    text: lang === 'es' ? 'Introducción' : lang === 'uk' ? 'Вступ' : 'Introduction',
    items: [
      { text: lang === 'es' ? 'Comenzar' : lang === 'uk' ? 'Початок роботи' : 'Getting Started', link: `${lang === 'en' ? '' : '/' + lang}/guide/getting-started` },
      { text: lang === 'es' ? 'Configuración' : lang === 'uk' ? 'Налаштування' : 'Configuration', link: `${lang === 'en' ? '' : '/' + lang}/guide/configuration` }
    ]
  },
  {
    text: lang === 'es' ? 'Características' : lang === 'uk' ? 'Функції' : 'Features',
    items: [
      { text: lang === 'es' ? 'Panel Web' : lang === 'uk' ? 'Веб-панель' : 'Web Panel', link: `${lang === 'en' ? '' : '/' + lang}/guide/panel` },
      { text: 'Mods', link: `${lang === 'en' ? '' : '/' + lang}/guide/mods` }
    ]
  },
  {
    text: lang === 'es' ? 'Avanzado' : lang === 'uk' ? 'Розширене' : 'Advanced',
    items: [
      { text: lang === 'es' ? 'Desarrollo' : lang === 'uk' ? 'Розробка' : 'Development', link: `${lang === 'en' ? '' : '/' + lang}/guide/development` },
      { text: lang === 'es' ? 'Soporte ARM64' : lang === 'uk' ? 'Підтримка ARM64' : 'ARM64 Support', link: `${lang === 'en' ? '' : '/' + lang}/guide/arm64` },
      { text: lang === 'es' ? 'Solución de Problemas' : lang === 'uk' ? 'Усунення несправностей' : 'Troubleshooting', link: `${lang === 'en' ? '' : '/' + lang}/guide/troubleshooting` }
    ]
  }
]

const referenceSidebar = (lang: string) => [
  {
    text: lang === 'es' ? 'Referencia' : lang === 'uk' ? 'Довідник' : 'Reference',
    items: [
      { text: lang === 'es' ? 'Variables de Entorno' : lang === 'uk' ? 'Змінні середовища' : 'Environment Variables', link: `${lang === 'en' ? '' : '/' + lang}/reference/environment` },
      { text: lang === 'es' ? 'Endpoints API' : lang === 'uk' ? 'API Ендпоінти' : 'API Endpoints', link: `${lang === 'en' ? '' : '/' + lang}/reference/api` },
      { text: lang === 'es' ? 'Eventos Socket' : lang === 'uk' ? 'Socket події' : 'Socket Events', link: `${lang === 'en' ? '' : '/' + lang}/reference/socket` }
    ]
  }
]

export default defineConfig({
  title,
  description: description.en,
  cleanUrls: true,
  lastUpdated: true,

  sitemap: {
    hostname: siteUrl
  },

  ignoreDeadLinks: [
    /^https?:\/\/localhost/
  ],

  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/images/favicon.ico' }],
    ['link', { rel: 'shortcut icon', href: '/images/favicon.ico' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/images/hytale.png' }],
    ['meta', { name: 'title', content: title }],
    ['meta', { name: 'author', content: 'Ketbome' }],
    ['meta', { name: 'keywords', content: 'hytale, server, docker, dedicated server, game server, web panel, admin panel, mods, modtale, jwt, authentication' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: siteUrl }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description.en }],
    ['meta', { property: 'og:image', content: `${siteUrl}/images/panel.png` }],
    ['meta', { property: 'og:site_name', content: title }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: description.en }],
    ['meta', { name: 'twitter:image', content: `${siteUrl}/images/panel.png` }],
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: title,
      description: description.en,
      url: siteUrl,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Linux, Windows, macOS',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      author: { '@type': 'Person', name: 'Ketbome', url: 'https://github.com/ketbome' }
    })]
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Reference', link: '/reference/environment' }
        ],
        sidebar: {
          '/guide/': guideSidebar('en'),
          '/reference/': referenceSidebar('en')
        },
        editLink: {
          pattern: 'https://github.com/ketbome/hytalepanel/edit/main/docs/:path',
          text: 'Edit this page on GitHub'
        },
        lastUpdated: { text: 'Last updated' },
        docFooter: { prev: 'Previous', next: 'Next' },
        outline: { level: [2, 3], label: 'On this page' },
        returnToTopLabel: 'Back to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Theme'
      }
    },
    es: {
      label: 'Español',
      lang: 'es-ES',
      link: '/es/',
      themeConfig: {
        nav: [
          { text: 'Guía', link: '/es/guide/getting-started' },
          { text: 'Referencia', link: '/es/reference/environment' }
        ],
        sidebar: {
          '/es/guide/': guideSidebar('es'),
          '/es/reference/': referenceSidebar('es')
        },
        editLink: {
          pattern: 'https://github.com/ketbome/hytalepanel/edit/main/docs/:path',
          text: 'Editar esta página en GitHub'
        },
        lastUpdated: { text: 'Última actualización' },
        docFooter: { prev: 'Anterior', next: 'Siguiente' },
        outline: { level: [2, 3], label: 'En esta página' },
        returnToTopLabel: 'Volver arriba',
        sidebarMenuLabel: 'Menú',
        darkModeSwitchLabel: 'Tema'
      }
    },
    uk: {
      label: 'Українська',
      lang: 'uk-UA',
      link: '/uk/',
      themeConfig: {
        nav: [
          { text: 'Посібник', link: '/uk/guide/getting-started' },
          { text: 'Довідник', link: '/uk/reference/environment' }
        ],
        sidebar: {
          '/uk/guide/': guideSidebar('uk'),
          '/uk/reference/': referenceSidebar('uk')
        },
        editLink: {
          pattern: 'https://github.com/ketbome/hytalepanel/edit/main/docs/:path',
          text: 'Редагувати цю сторінку на GitHub'
        },
        lastUpdated: { text: 'Останнє оновлення' },
        docFooter: { prev: 'Попередня', next: 'Наступна' },
        outline: { level: [2, 3], label: 'На цій сторінці' },
        returnToTopLabel: 'Повернутися нагору',
        sidebarMenuLabel: 'Меню',
        darkModeSwitchLabel: 'Тема'
      }
    }
  },

  themeConfig: {
    logo: '/images/hytale.png',
    siteTitle: 'HytalePanel',

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ketbome/hytalepanel' }
    ],

    search: {
      provider: 'local',
      options: {
        locales: {
          es: {
            translations: {
              button: { buttonText: 'Buscar', buttonAriaLabel: 'Buscar' },
              modal: {
                noResultsText: 'Sin resultados para',
                resetButtonTitle: 'Limpiar búsqueda',
                footer: { selectText: 'seleccionar', navigateText: 'navegar', closeText: 'cerrar' }
              }
            }
          },
          uk: {
            translations: {
              button: { buttonText: 'Пошук', buttonAriaLabel: 'Пошук' },
              modal: {
                noResultsText: 'Немає результатів для',
                resetButtonTitle: 'Очистити пошук',
                footer: { selectText: 'вибрати', navigateText: 'навігація', closeText: 'закрити' }
              }
            }
          }
        }
      }
    },

    footer: {
      message: 'Not affiliated with Hypixel Studios or Hytale.',
      copyright: 'Free for personal and non-commercial use'
    }
  }
})
