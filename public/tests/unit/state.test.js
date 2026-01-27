/**
 * State Management Tests
 */
import { store } from '../../js/ai-editor/core/state.js';

const runner = new TestRunner();

runner.describe('State Management', () => {

    runner.it('should initialize with default state', () => {
        assert.exists(store.state, 'State should exist');
        assert.typeOf(store.state, 'object', 'State should be object');
    });

    runner.it('should update state correctly', () => {
        store.state.cover = { ...store.state.cover, title: 'New Album' };
        assert.equal(store.state.cover.title, 'New Album', 'Title should update');
    });

    runner.it('should notify listeners on state change', () => {
        let notified = false;
        const unsubscribe = store.subscribe(() => {
            notified = true;
        });

        store.state.theme = 'modern';
        assert.true(notified, 'Listener should be notified');

        unsubscribe();
    });

    runner.it('should handle nested state updates', () => {
        const newCover = { ...store.state.cover, subtitle: 'Updated Subtitle' };
        store.state.cover = newCover;
        assert.equal(store.state.cover.subtitle, 'Updated Subtitle', 'Nested update via top-level set');
    });

    runner.it('should maintain state history', () => {
        store.reset();
        store.pushState('Init');

        // Use a property that IS tracked in history (pages, cover, theme)
        // viewMode is NOT tracked.

        // Change Theme
        store.setTheme('dark-mode');
        store.pushState('Change to Dark');

        // Change Theme again
        store.setTheme('light-mode');
        store.pushState('Change to Light');

        assert.equal(store.state.theme, 'light-mode', 'Theme should be light');

        store.undo();
        assert.equal(store.state.theme, 'dark-mode', 'Should undo to dark mode');
    });

    runner.it('should reset to initial state', () => {
        store.state.theme = 'dramatic';
        store.reset();
        assert.equal(store.state.theme, 'classic', 'State should reset');
    });

    runner.it('should add pages via action', () => {
        const count = store.state.pages.length;
        store.addPage();
        assert.equal(store.state.pages.length, count + 1, 'Page count should increase');
    });
});

runner.run();
