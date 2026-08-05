// SPDX-FileCopyrightText: 2023 Deminder <tremminder@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Rsvg from 'gi://Rsvg';

import { foxSvg } from './foxicon.js';

/**
 * Battery panel icon rendered from a dynamically generated SVG.
 *
 * Replaces the Cairo-drawn Buddy face: the fox SVG produced by foxSvg() is
 * rendered at runtime via librsvg, so the panel always shows the same design
 * as the preview SVGs.
 */
export const FoxBatteryIcon = GObject.registerClass(
  {
    Properties: {
      percentage: GObject.ParamSpec.int(
        'percentage',
        'percentage',
        'percentage',
        GObject.ParamFlags.READWRITE,
        0
      ),
      charging: GObject.ParamSpec.boolean(
        'charging',
        'charging',
        'charging',
        GObject.ParamFlags.READWRITE,
        false
      ),
    },
  },
  class FoxBatteryIcon extends St.DrawingArea {
    _init({ style_class }) {
      super._init({
        y_align: Clutter.ActorAlign.CENTER,
        style_class,
      });
      for (const signal of [
        'notify::percentage',
        'notify::charging',
        'style-changed',
      ]) {
        this.connect(signal, () => this.queue_repaint());
      }
    }

    vfunc_repaint() {
      const [w, h] = this.get_surface_size();
      if (w <= 0 || h <= 0) {
        return;
      }
      const cr = this.get_context();
      try {
        const handle = Rsvg.Handle.new_from_data(
          new TextEncoder().encode(
            foxSvg({
              percentage: this.percentage,
              charging: this.charging,
              width: w,
              height: h,
            })
          )
        );
        handle.render_cairo(cr);
      } catch (e) {
        log(`battery-buddy: foxicon render failed: ${e}`);
      } finally {
        // Explicitly tell Cairo to free the context memory
        // https://gjs.guide/guides/gjs/memory-management.html#cairo
        cr.$dispose();
      }
    }
  }
);
