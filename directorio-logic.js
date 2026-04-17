/* Directorio Médico HM — lógica y render
   Depende de: directorio-data.js (debe cargarse primero) */
(function () {
  'use strict';

  /* ── Esperar a que el DOM esté listo ── */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {

    /* ── Verificar que los datos existen ── */
    if (typeof DM_DATA === 'undefined') {
      console.error('[DirectorioMedico] DM_DATA no encontrado. Cargá directorio-data.js primero.');
      return;
    }

    var doctors = DM_DATA.doctors;
    var procs   = DM_DATA.procedures;

    /* ── Proc map por Id Medico ── */
    var procMap = {};
    procs.forEach(function (p) {
      var id = (p['Id Medico'] || '').trim();
      if (id && id !== '-') {
        if (!procMap[id]) procMap[id] = [];
        procMap[id].push(p);
      }
    });

    /* ── Helpers ── */
    function esc(s) {
      return (s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function fmtPrice(v) {
      if (!v || !v.trim() || /precio brinda|consulta/i.test(v))
        return '<span class="dm-p-na">En consulta</span>';
      var n = parseFloat((v || '').replace(/[^0-9.]/g, ''));
      if (!isNaN(n) && n > 0) return '\u20a1\u202f' + n.toLocaleString('es-CR');
      return esc(v);
    }

    function badge(v) {
      var t = (v || '').trim();
      if (t === 'SI') return '<span class="dm-b-si">SI</span>';
      if (t === 'NO') return '<span class="dm-b-no">NO</span>';
      return '<span class="dm-b-na">' + (t || '—') + '</span>';
    }

    function seguros(v) {
      if (!v || !v.trim()) return '—';
      var segs = v.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
      return '<div class="dm-seg-wrap">' +
        segs.map(function (s) { return '<span class="dm-seg">' + esc(s) + '</span>'; }).join('') +
        '</div>';
    }

    function priceBlockMain(doc) {
      var rt = fmtPrice(doc['Precio Regular Tarjeta']);
      var re = fmtPrice(doc['Precio Regular Efectivo']);
      var out = '<div class="dm-price-block">';
      out += '<div><span class="dm-pl">Tarjeta:</span> <strong>' + rt + '</strong></div>';
      if ((doc['Precio Regular Efectivo'] || '') !== (doc['Precio Regular Tarjeta'] || ''))
        out += '<div><span class="dm-pl">Efectivo:</span> <strong>' + re + '</strong></div>';
      return out + '</div>';
    }

    function priceBlockMS(doc) {
      var mt = (doc['Precio MS Tarjeta'] || '').trim();
      var me = (doc['Precio MS Efectivo'] || '').trim();
      if (!mt && !me) return '—';
      var out = '<div class="dm-price-block dm-price-ms">';
      out += '<div><span class="dm-pl">Tarjeta:</span> <strong>' + fmtPrice(mt) + '</strong></div>';
      if (me && me !== mt)
        out += '<div><span class="dm-pl">Efectivo:</span> <strong>' + fmtPrice(me) + '</strong></div>';
      return out + '</div>';
    }

    /* ── Populate selects ── */
    function uniq(field) {
      var seen = {}, out = [];
      doctors.forEach(function (d) {
        var v = (d[field] || '').trim();
        if (v && !seen[v]) { seen[v] = 1; out.push(v); }
      });
      return out.sort(function (a, b) { return a.localeCompare(b, 'es'); });
    }

    function fill(id, vals) {
      var s = document.getElementById(id);
      if (!s) return;
      vals.forEach(function (v) {
        var o = document.createElement('option');
        o.value = v; o.textContent = v; s.appendChild(o);
      });
    }

    fill('dm-fSede', uniq('Sede'));
    fill('dm-fEsp',  uniq('Especialidad'));
    fill('dm-fMod',  uniq('Modalidad Cita'));
    fill('dm-fAg',   uniq('Agenda'));

    var totEl = document.getElementById('dm-tot');
    if (totEl) totEl.textContent = doctors.length;

    /* ── Sort state ── */
    var sortKey = null, sortDir = 1;

    /* ── Filtering ── */
    function getFiltered() {
      var q   = (document.getElementById('dm-fNombre').value || '').toLowerCase();
      var sed = document.getElementById('dm-fSede').value;
      var esp = document.getElementById('dm-fEsp').value;
      var mod = document.getElementById('dm-fMod').value;
      var ms  = document.getElementById('dm-fMS').value;
      var ag  = document.getElementById('dm-fAg').value;
      return doctors.filter(function (d) {
        if (q   && !(d['Nombre Doctor'] || '').toLowerCase().includes(q))  return false;
        if (sed && (d['Sede'] || '').trim() !== sed)                        return false;
        if (esp && (d['Especialidad'] || '').trim() !== esp)                return false;
        if (mod && (d['Modalidad Cita'] || '').trim() !== mod)              return false;
        if (ms  && (d['Acepta Medismart'] || '').trim() !== ms)             return false;
        if (ag  && (d['Agenda'] || '').trim() !== ag)                       return false;
        return true;
      });
    }

    function getSorted(arr) {
      if (!sortKey) return arr;
      return arr.slice().sort(function (a, b) {
        var av = (a[sortKey] || '').toLowerCase();
        var bv = (b[sortKey] || '').toLowerCase();
        return av < bv ? -sortDir : av > bv ? sortDir : 0;
      });
    }

    /* ── Render ── */
    function render() {
      var data = getSorted(getFiltered());
      var cntEl = document.getElementById('dm-cnt');
      var cnt2El = document.getElementById('dm-cnt2');
      if (cntEl) cntEl.textContent = data.length;
      if (cnt2El) {
        var uniqNames = {};
        data.forEach(function(d){ uniqNames[d['Nombre Doctor']] = 1; });
        cnt2El.textContent = Object.keys(uniqNames).length + ' médicos únicos';
      }

      var tbody = document.getElementById('dm-tbody');
      if (!tbody) return;

      if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="24" style="text-align:center;padding:30px;color:#888;">Sin resultados con los filtros seleccionados.</td></tr>';
        return;
      }

      tbody.innerHTML = data.map(function (doc) {
        var id  = (doc['Id Medico'] || '').trim();
        var cnt = (procMap[id] || []).length;
        var docJson = JSON.stringify(JSON.stringify(doc));
        var btnP = cnt > 0
          ? '<button class="dm-btn-proc" onclick=\'dmOpenModal(' + docJson + ')\'>'
            + '&#128203; Procedimientos <span class="dm-cnt-badge">' + cnt + '</span></button>'
          : '<span class="dm-no-proc">Sin procedimientos</span>';

        return '<tr>'
          + '<td><strong class="dm-doc-name">' + esc(doc['Nombre Doctor']) + '</strong>'
            + '<div class="dm-doc-id">' + esc(doc['Id Medico']) + '</div></td>'
          + '<td>' + esc(doc['Especialidad']) + '</td>'
          + '<td>' + esc(doc['Sede']) + '</td>'
          + '<td class="dm-nowrap">Piso ' + esc(doc['Piso'] || '—')
            + '<br><span class="dm-sub">Cons. ' + esc(doc['Número Del Consultorio'] || '—') + '</span></td>'
          + '<td class="dm-nowrap">' + esc(doc['Extensión'] || '—') + '</td>'
          + '<td>' + esc(doc['Secretarias'] || '—') + '</td>'
          + '<td class="dm-nowrap">' + esc(doc['Agenda'] || '—') + '</td>'
          + '<td class="dm-nowrap">' + esc(doc['Modalidad Cita'] || '—') + '</td>'
          + '<td>' + badge(doc['Cobro Anticipado']) + '</td>'
          + '<td>' + badge(doc['Agenda Call Center']) + '</td>'
          + '<td>' + badge(doc['Medicina Mixta']) + '</td>'
          + '<td>' + badge(doc['Acepta Medismart']) + '</td>'
          + '<td class="dm-horario">' + esc((doc['Horario de Atención'] || '—').replace(/\n/g, ' | ')) + '</td>'
          + '<td>' + priceBlockMain(doc) + '</td>'
          + '<td>' + priceBlockMS(doc) + '</td>'
          + '<td class="dm-nowrap dm-small">' + esc(doc['Forma De Pago'] || '—') + '</td>'
          + '<td class="dm-small">' + esc(doc['Enfoque De Atención'] || '—') + '</td>'
          + '<td class="dm-nowrap">' + (doc['Tiempo de Consulta'] ? doc['Tiempo de Consulta'] + ' min' : '—') + '</td>'
          + '<td class="dm-nowrap">' + (doc['Tiempo De Espera'] ? doc['Tiempo De Espera'] + ' min' : '—') + '</td>'
          + '<td class="dm-small">' + esc(doc['Método De Ingreso'] || '—') + '</td>'
          + '<td class="dm-small">' + esc(doc['Correo Electrónico'] || '—') + '</td>'
          + '<td>' + seguros(doc['Seguros_Todos']) + '</td>'
          + '<td class="dm-comment">' + esc(doc['Comentario'] || '') + '</td>'
          + '<td class="dm-nowrap">' + btnP + '</td>'
          + '</tr>';
      }).join('');
    }

    /* ── Sort headers ── */
    document.querySelectorAll('#dm-tbl thead th[data-k]').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.dataset.k;
        if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = 1; }
        document.querySelectorAll('#dm-tbl thead th').forEach(function (t) {
          t.classList.remove('asc', 'desc');
        });
        th.classList.add(sortDir === 1 ? 'asc' : 'desc');
        render();
      });
    });

    /* ── Filter events ── */
    ['dm-fNombre', 'dm-fSede', 'dm-fEsp', 'dm-fMod', 'dm-fMS', 'dm-fAg'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', render);
    });

    var btnReset = document.getElementById('dm-btnReset');
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        ['dm-fNombre', 'dm-fSede', 'dm-fEsp', 'dm-fMod', 'dm-fMS', 'dm-fAg'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.value = '';
        });
        sortKey = null; sortDir = 1;
        document.querySelectorAll('#dm-tbl thead th').forEach(function (t) {
          t.classList.remove('asc', 'desc');
        });
        render();
      });
    }

    /* ── MODAL ── */
    window.dmOpenModal = function (jsonStr) {
      var doc = JSON.parse(jsonStr);
      var id  = (doc['Id Medico'] || '').trim();
      var ps  = procMap[id] || [];

      document.getElementById('dm-mName').textContent = doc['Nombre Doctor'] || '';
      document.getElementById('dm-mSub').textContent  =
        (doc['Especialidad'] || '') + ' — ' + (doc['Sede'] || '');

      /* Info grid */
      var infoFields = [
        ['ID Médico',        doc['Id Medico']],
        ['Sede',             doc['Sede']],
        ['Piso',             doc['Piso'] ? 'Piso ' + doc['Piso'] : '—'],
        ['Consultorio',      doc['Número Del Consultorio'] || '—'],
        ['Extensión',        doc['Extensión'] || '—'],
        ['Secretaría',       doc['Secretarias'] || '—'],
        ['Agenda',           doc['Agenda'] || '—'],
        ['Modalidad',        doc['Modalidad Cita'] || '—'],
        ['Cobro Anticipado', doc['Cobro Anticipado'] || '—'],
        ['Call Center',      doc['Agenda Call Center'] || '—'],
        ['Medicina Mixta',   doc['Medicina Mixta'] || '—'],
        ['Medismart',        doc['Acepta Medismart'] || '—'],
        ['Forma de Pago',    doc['Forma De Pago'] || '—'],
        ['Enfoque',          doc['Enfoque De Atención'] || '—'],
        ['T. Consulta',      doc['Tiempo de Consulta'] ? doc['Tiempo de Consulta'] + ' min' : '—'],
        ['T. Espera',        doc['Tiempo De Espera'] ? doc['Tiempo De Espera'] + ' min' : '—'],
        ['Método Ingreso',   doc['Método De Ingreso'] || '—'],
        ['Correo',           doc['Correo Electrónico'] || '—'],
        ['Horario',          doc['Horario de Atención'] || '—'],
        ['Comentario',       doc['Comentario'] || '—'],
      ];
      document.getElementById('dm-infoGrid').innerHTML = infoFields.map(function (f) {
        return '<div class="dm-di"><label>' + esc(f[0]) + '</label><span>' + esc(f[1]) + '</span></div>';
      }).join('');

      /* Prices */
      var rt = fmtPrice(doc['Precio Regular Tarjeta']);
      var re = fmtPrice(doc['Precio Regular Efectivo']);
      var mt = fmtPrice(doc['Precio MS Tarjeta']);
      var me = fmtPrice(doc['Precio MS Efectivo']);
      var iva = doc['Iva'] && doc['Iva'] !== '0'
        ? '<div class="dm-pr"><span class="dm-pl">IVA</span><span class="dm-pv">\u20a1\u202f' +
          parseFloat(doc['Iva'] || 0).toLocaleString('es-CR') + '</span></div>' : '';
      document.getElementById('dm-prices').innerHTML =
        '<div class="dm-price-card">'
        + '<h4>&#128179; Precio Regular — Consulta</h4>'
        + '<div class="dm-pr"><span class="dm-pl">Tarjeta</span><span class="dm-pv">' + rt + '</span></div>'
        + '<div class="dm-pr"><span class="dm-pl">Efectivo</span><span class="dm-pv">' + re + '</span></div>'
        + iva
        + '</div>'
        + '<div class="dm-price-card dm-price-card-ms">'
        + '<h4>&#11088; Precio Medismart — Consulta</h4>'
        + '<div class="dm-pr"><span class="dm-pl">Tarjeta</span><span class="dm-pv dm-ms-v">' + mt + '</span></div>'
        + '<div class="dm-pr"><span class="dm-pl">Efectivo</span><span class="dm-pv dm-ms-v">' + me + '</span></div>'
        + '</div>';

      /* Seguros */
      var segs = (doc['Seguros_Todos'] || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
      document.getElementById('dm-segsBlock').innerHTML = segs.length
        ? '<div class="dm-segs-lbl">&#128737;&#65039; Seguros aceptados</div>'
          + '<div class="dm-seg-wrap dm-mb">' + segs.map(function (s) {
              return '<span class="dm-seg">' + esc(s) + '</span>';
            }).join('') + '</div>'
        : '';

      /* Procs header */
      document.getElementById('dm-procsHdr').innerHTML =
        '&#128203; Procedimientos <span class="dm-pc2">' + ps.length + '</span>';

      /* Procs table */
      if (!ps.length) {
        document.getElementById('dm-procsContent').innerHTML =
          '<div class="dm-no-procs-msg">No hay procedimientos registrados para este médico.</div>';
      } else {
        document.getElementById('dm-procsContent').innerHTML =
          '<div class="dm-ptable-wrap">'
          + '<table class="dm-ptable"><thead><tr>'
          + '<th>#</th><th>Procedimiento</th><th>Sede</th>'
          + '<th>Precio Regular<br>Tarjeta</th><th>Precio Regular<br>Efectivo</th><th>IVA</th>'
          + '<th>Precio MS<br>Tarjeta</th><th>Precio MS<br>Efectivo</th>'
          + '<th>Horario</th><th>Tiempo</th><th>Comentarios</th>'
          + '</tr></thead><tbody>'
          + ps.map(function (p, i) {
              var iva2 = p['Iva'] && p['Iva'] !== '0'
                ? '\u20a1\u202f' + parseFloat(p['Iva']).toLocaleString('es-CR') : '—';
              return '<tr>'
                + '<td class="dm-pnum">' + (i + 1) + '</td>'
                + '<td class="dm-pname">' + esc(p['Procedimiento']) + '</td>'
                + '<td class="dm-psede">' + esc(p['Sede']) + '</td>'
                + '<td class="dm-pprice">' + fmtPrice(p['Precio Regular Tarjeta']) + '</td>'
                + '<td class="dm-pprice">' + fmtPrice(p['Precio Regular Efectivo']) + '</td>'
                + '<td class="dm-small dm-nowrap">' + iva2 + '</td>'
                + '<td class="dm-pms">' + fmtPrice(p['Precio MS Tarjeta']) + '</td>'
                + '<td class="dm-pms">' + fmtPrice(p['Precio MS Efectivo']) + '</td>'
                + '<td class="dm-psede">' + esc(p['Horario de Atención'] || '—') + '</td>'
                + '<td class="dm-small dm-nowrap">' + (p['Tiempo de Consulta'] ? p['Tiempo de Consulta'] + ' min' : '—') + '</td>'
                + '<td class="dm-pcom">' + esc(p['Comentarios']) + '</td>'
                + '</tr>';
            }).join('')
          + '</tbody></table></div>';
      }

      document.getElementById('dm-overlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    document.getElementById('dm-mcls').addEventListener('click', dmClose);
    document.getElementById('dm-overlay').addEventListener('click', function (e) {
      if (e.target.id === 'dm-overlay') dmClose();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') dmClose();
    });

    window.dmClose = function () {
      document.getElementById('dm-overlay').classList.remove('open');
      document.body.style.overflow = '';
    };

    /* ── Init ── */
    render();

  }); // ready
})();
