/*
 * Argos - Create GNOME Shell extensions in seconds
 *
 * Copyright (c) 2016-2018 Philipp Emanuel Weidmann <pew@worldwidemann.com>
 *
 * Nemo vir est qui mundum non reddat meliorem.
 *
 * Released under the terms of the GNU General Public License, version 3
 * (https://gnu.org/licenses/gpl.html)
 */

const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const GdkPixbuf = imports.gi.GdkPixbuf;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;

var ArgosLineView = new Lang.Class({
  Name: "ArgosLineView",
  Extends: St.BoxLayout,

  _init: function(line) {
    this.parent({
      style_class: "argos-line-view"
    });
    this._cache = {};
    if (typeof line !== "undefined")
      this.setLine(line);
  },

  setLine: function(line) {
    if (line.hasOwnProperty("templateImage") && !line.hasOwnProperty("image"))
      line.image = line.templateImage;

    // see if we can reuse previous' containers.
    // Criteria: it should has the same type of fields as its cached version.
    //          (except for image property, where, if used, the contained data
    //           also needs to be the same as before as well, because there's 
    //           no way to alter the stored base64 data in actor)
    if (
        this.line == null ||
        this.line.hasOwnProperty("iconName") != line.hasOwnProperty("iconName") || 
        this.line.hasOwnProperty("image") != line.hasOwnProperty("image") || 
        (this.line.markup.length > 0) != (line.markup.length > 0) || 
        (this.line.hasOwnProperty("image") && this._image_source_cache != line.image)
    ) {

      this._cache = {};
      // type of data had been changed, so we will need to rebuild from scratch.
      this.remove_all_children();

      if (line.hasOwnProperty("iconName")) {
        this._cache.icon_name = line.iconName;
        this._cache.icon = new St.Icon({
          style_class: "popup-menu-icon",
          icon_name: this._cache.icon_name
        });
        this.add_child(this._cache.icon);
      }

      if (line.hasOwnProperty("image")) {
        // Source: https://github.com/GNOME/gnome-maps (mapSource.js)
        let bytes = GLib.Bytes.new(GLib.base64_decode(line.image));
        let stream = Gio.MemoryInputStream.new_from_bytes(bytes);

        try {
          let pixbuf = GdkPixbuf.Pixbuf.new_from_stream(stream, null);

          // TextureCache.load_gicon returns a square texture no matter what the Pixbuf's
          // actual dimensions are, so we request a size that can hold all pixels of the
          // image and then resize manually afterwards
          let size = Math.max(pixbuf.width, pixbuf.height);
          let texture = St.TextureCache.get_default().load_gicon(null, pixbuf, size, 1, 1.0);

          let aspectRatio = pixbuf.width / pixbuf.height;

          let width = parseInt(line.imageWidth, 10);
          let height = parseInt(line.imageHeight, 10);

          if (isNaN(width) && isNaN(height)) {
            width = pixbuf.width;
            height = pixbuf.height;
          } else if (isNaN(width)) {
            width = Math.round(height * aspectRatio);
          } else if (isNaN(height)) {
            height = Math.round(width / aspectRatio);
          }

          texture.set_size(width, height);

          this.add_child(texture);
          // Do not stretch the texture to the height of the container
          this.child_set_property(texture, "y-fill", false);
        } catch (error) {
          log("Unable to load image from Base64 representation: " + error);
        }
      }

      if (line.markup.length > 0) {
        this._cache.line_markup = line.markup;
        let label = new St.Label({
          y_expand: true,
          y_align: Clutter.ActorAlign.CENTER
        });

        this.add_child(label);
        // this._label_cache = label;
        this._cache.clutter_text = label.get_clutter_text();
        this._cache.clutter_text.use_markup = true;
        // double this up seems to fix the problem with markup not applying
        this._cache.clutter_text.text = line.markup;
        this._cache.clutter_text.text = line.markup;
      }
      this._image_source_cache = line.image;
      
    } else {
      // reuse previously built containers
      if (this._cache.line_markup != line.markup) {
        this._cache.line_markup = line.markup;
        // Note: that the text is being set twice because setting it only once somehow 
        // CAN update the text but DOES NOT update the pango layout (the updated
        // layout is then used in the subsequent line)
        // Maybe each call will update the text and the underlying pango markup,
        // but the markup is not updated/redraw until the next text's update?
        // This is only really necessary if the pango layout has been changed, but
        // it doesn't hurts (except maybe performance...)
        this._cache.clutter_text.text = line.markup;
        this._cache.clutter_text.text = line.markup;
      }
      
      if (line.hasOwnProperty("iconName") && this._icon_name_cache != line.iconName)
        this._cache.icon.set_icon_name(line.iconName);
    }

    this.line = line;
  },

  setMarkup: function(markup) {
    this.setLine({
      markup: markup
    });
  }
});
