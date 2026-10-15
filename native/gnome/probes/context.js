import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {read, waitFor, command, startDriver, capture} from './integration.js';

export const METRICS = {};
const output = GLib.getenv('CATJANG_PROTOTYPE_OUTPUT');
const observations = [];
function assert(value, message) {
    if (!value) throw new Error(message);
    observations.push(message);
    console.log(`[Catjang context] ${message}`);
}

export async function run() {
    await Scripting.waitTestWindows();
    const pointer = Clutter.get_default_backend().get_default_seat()
        .create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
    const keyboard = Clutter.get_default_backend().get_default_seat()
        .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
    await Scripting.sleep(1000);
    Main.overview.hide();
    await Scripting.sleep(350);
    const dir = `${output}/driver`, app = startDriver(dir, {agents: true});
    const pet = Main.extensionManager.lookup('catjang-native@modlovelace.github.io').stateObj;
    async function click(x, y, button = Clutter.BUTTON_PRIMARY) {
        pointer.notify_absolute_motion(GLib.get_monotonic_time(), x, y);
        await Scripting.sleep(50);
        pointer.notify_button(GLib.get_monotonic_time(), button, Clutter.ButtonState.PRESSED);
        await Scripting.sleep(40);
        pointer.notify_button(GLib.get_monotonic_time(), button, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(250);
    }
    async function clickItem(item) {
        await waitFor(() => item?.mapped, 'Menu item is not mapped');
        const [x, y] = item.get_transformed_position(), [w, h] = item.get_transformed_size();
        assert(w > 0 && h > 0 && global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x+w/2, y+h/2), 'Menu target has a real pointer surface');
        await click(x+w/2, y+h/2);
    }
    async function open() {
        await command(dir, 'hide');
        const head = pet._catalog[pet._mascot].petting;
        await click(pet._actor.x+pet._size*head.cx, pet._actor.y+pet._size*head.cy, Clutter.BUTTON_SECONDARY);
        assert(pet._menu?.isOpen && !pet._grab, 'Right click opens the menu without a drag capture');
    }
    async function select(id, submenu) {
        await open();
        if (submenu) {
            await clickItem(pet._menu._getMenuItems().find(item => item.label?.text === submenu));
            await Scripting.sleep(200);
        }
        await clickItem(pet._contextItems.get(id));
        assert(!pet._menu.isOpen && !pet._menuManager._grab, `${id}: selection closes the menu and releases capture`);
    }
    try {
        const ready = await waitFor(() => read(`${dir}/ready.json`), 'Application failed to attach');
        assert([4,5].includes(ready.extensionVersion), `Menu audit uses real extension v${ready.extensionVersion}`);
        await command(dir, 'configure', {mascot:'cat', name:'Menú QA', nameVisible:true, size:200});
        await select('stretch');
        assert(pet._stretchActor && !pet._actor.visible, 'Estirarse starts its fullscreen actor through an actual context-menu click');
        await Scripting.sleep(1000);
        assert(pet._stretchActor.opacity > 0 && pet._stretchActor.opacity < 180 && !pet._stretchActor.reactive, 'Context stretch stays visible, translucent and click-through in the middle');
        await capture('context-stretch.png');
        await waitFor(() => !pet._stretchActor && pet._actor.visible, 'Stretch did not restore the pet');
        assert(!pet._grab && !pet._menuManager._grab, 'Stretch ends without either pointer capture');
        await select('jump');
        assert(pet._frame.startsWith('jump'), 'Saltar animates from the menu');
        await Scripting.sleep(800);
        for (const [id, panel] of [['preferences','settings'], ['reminders','reminders'], ['pomodoro-settings','pomodoro']]) {
            await select(id, id === 'pomodoro-settings' ? 'Pomodoro' : null);
            const state = await command(dir, 'query');
            assert(state.windowVisible, `${id}: preferences window is shown`);
            await command(dir, 'ui', `if(document.getElementById('panel-${panel}').hidden)throw new Error('Incorrect panel');true`);
            assert(true, `${id}: the requested panel is selected`);
        }
        await select('pomodoro-toggle', 'Pomodoro');
        assert((await command(dir,'query')).features.pomodoro.running, 'Pomodoro menu starts the real timer');
        await Scripting.sleep(1100);
        await select('pomodoro-toggle', 'Pomodoro');
        assert(!(await command(dir,'query')).features.pomodoro.running, 'Pomodoro menu pauses the real timer');
        await select('pomodoro-toggle', 'Pomodoro');
        assert((await command(dir,'query')).features.pomodoro.running, 'Pomodoro menu resumes the real timer');
        await select('pomodoro-reset', 'Pomodoro');
        const timer = (await command(dir,'query')).features.pomodoro;
        assert(!timer.running && timer.remainingSec === timer.focusMin*60, 'Pomodoro menu resets the timer and stops it');
        for (const [id, size] of [['size-smaller',180], ['size-larger',200]]) {
            await select(id, 'Tamaño');
            assert(pet._size === size && (await command(dir,'query')).saved.petSize === size, `${id}: size reaches the native actor and persistence`);
            await command(dir, 'ui', `if(Number(document.getElementById('size').value)!==${size})throw new Error('Size form is stale after menu selection');true`);
        }
        for (const [id, size] of [['size-smaller',40], ['size-larger',400]]) {
            await command(dir,'configure',{mascot:'cat',name:'Menú QA',nameVisible:true,size});
            await select(id,'Tamaño');
            assert(pet._size===size && (await command(dir,'query')).saved.petSize===size, `${id}: the size boundary ${size} is respected`);
        }
        await command(dir,'configure',{mascot:'cat',name:'Menú QA',nameVisible:true,size:200});
        for (const visible of [false,true]) {
            await select('name-toggle');
            assert(pet._nameLabel.visible === visible && (await command(dir,'query')).saved.showCatName === visible, 'Name menu toggles visibility and persistence');
            await command(dir, 'ui', `if(document.getElementById('nameVisible').checked!==${visible})throw new Error('Name form is stale after menu selection');true`);
        }
        await select('agents-setup');
        await Scripting.sleep(350);
        await command(dir,'inspect-agent-setup');
        assert(true, 'Agent setup opens from the menu without starting integrations or installing hooks');
        for (const [id, info] of Object.entries(ready.catalog)) {
            await select(`mascot-${id}`, 'Mascotas');
            await waitFor(() => pet._mascot === id, `Mascot ${id} was not selected`);
            assert((await command(dir,'query')).saved.mascot === id, `${id}: menu selects and persists the mascot`);
            await open();
            assert(pet._contextItems.has('stretch') === (ready.extensionVersion<5 || info.stretchSupported), `${id}: stretch menu matches the loaded extension capabilities`);
            keyboard.notify_keyval(GLib.get_monotonic_time(),Clutter.KEY_Escape,Clutter.KeyState.PRESSED);
            keyboard.notify_keyval(GLib.get_monotonic_time(),Clutter.KEY_Escape,Clutter.KeyState.RELEASED);
            await Scripting.sleep(250);
            assert(!pet._menu.isOpen && !pet._menuManager._grab, `${id}: Escape releases the menu`);
            if(ready.extensionVersion<5 && !info.stretchSupported){
                await select('stretch');
                const result=await command(dir,'query');
                assert(!pet._stretchActor && result.state.connected && result.windowVisible && result.state.status.includes('Catjang'), `${id}: legacy stretch explains that Catjang is required instead of silently doing nothing`);
            }
        }
        await select('quit');
        await waitFor(() => !pet._owner && !pet._actor.visible, 'Menu Quit did not detach the pet');
        assert(!pet._grab && !pet._menuManager?._grab, 'Salir quits the actual application and clears the native owner and all captures');
        GLib.file_set_contents(`${output}/context-observations.json`, JSON.stringify({timestampUtc:GLib.DateTime.new_now_utc().format_iso8601(), extensionVersion:ready.extensionVersion, observations,
            limitations:['Isolated GNOME/Wayland; no desktop logout or automatic personal IDE consent']},null,2));
    } catch (error) {
        await capture('context-failure.png');
        throw error;
    } finally {
        app.force_exit();
        await Scripting.sleep(300);
    }
}
