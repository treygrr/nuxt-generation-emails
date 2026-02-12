#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'
import addCommand from './add'
import regenerateCommand from './regenerate'

const main = defineCommand({
  meta: {
    name: 'nuxt-gen-emails',
    description: 'CLI for nuxt-gen-emails module',
    version: '1.0.0',
  },
  subCommands: {
    add: addCommand,
    regenerate: regenerateCommand,
  },
})

runMain(main)
