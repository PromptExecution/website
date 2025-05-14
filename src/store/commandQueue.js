// store/commandQueue.js
import { defineStore } from 'pinia';

export const useCommandQueueStore = defineStore('commandQueue', {
  state: () => ({
    commands: []
  }),
  actions: {
    addCommand(command) {
      this.commands.push(command);
    },
    getNextCommand() {
      return this.commands.shift(); // Removes and returns the first command
    }
  }
});

