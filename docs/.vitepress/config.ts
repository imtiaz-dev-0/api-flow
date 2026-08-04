import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'api-flow',
  description: 'The easiest and most powerful API client for JavaScript and TypeScript',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'og:title', content: 'api-flow' }],
    ['meta', { name: 'og:description', content: 'The easiest and most powerful API client for JavaScript and TypeScript' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'api-flow',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Playground', link: '/playground' },
      { text: 'npm', link: 'https://npmjs.com/package/api-flow' },
      {
        text: 'v0.1.0',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'Contributing', link: '/contributing' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Configuration', link: '/guide/configuration' },
          ],
        },
        {
          text: 'Core Features',
          items: [
            { text: 'HTTP Methods', link: '/guide/http-methods' },
            { text: 'Authentication', link: '/guide/authentication' },
            { text: 'Caching', link: '/guide/caching' },
            { text: 'Retry & Backoff', link: '/guide/retry' },
            { text: 'Interceptors', link: '/guide/interceptors' },
            { text: 'Error Handling', link: '/guide/errors' },
            { text: 'TypeScript', link: '/guide/typescript' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'React Hooks', link: '/guide/react-hooks' },
            { text: 'File Upload', link: '/guide/upload' },
            { text: 'Pagination', link: '/guide/pagination' },
            { text: 'Plugins', link: '/guide/plugins' },
            { text: 'Events', link: '/guide/events' },
            { text: 'Offline Mode', link: '/guide/offline' },
            { text: 'Performance Metrics', link: '/guide/metrics' },
          ],
        },
        {
          text: 'Integrations',
          items: [
            { text: 'Next.js', link: '/guide/nextjs' },
            { text: 'React Native', link: '/guide/react-native' },
            { text: 'Vue', link: '/guide/vue' },
            { text: 'Node.js', link: '/guide/nodejs' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/api-flow/api-flow' },
      { icon: 'twitter', link: 'https://twitter.com/apiflow_dev' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present api-flow contributors',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/api-flow/api-flow/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
})
