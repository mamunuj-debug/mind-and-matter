import csv
import re
from pathlib import Path

report = Path('/nfs/site/disks/zsc14.xne_irw.085/mdmamunu/IRW_HV_RUNS_WW15/openrail/irw_ddrss/results/irw_ddrss.static_eos.rpt')
out_tsv = Path('/nfs/site/disks/zsc14.xne_irw.085/mdmamunu/IRW_HV_RUNS_WW15/irw_ddrss.static_eos.table.tsv')
out_md = Path('/nfs/site/disks/zsc14.xne_irw.085/mdmamunu/IRW_HV_RUNS_WW15/irw_ddrss.static_eos.table.md')
out_csv = Path('/nfs/site/disks/zsc14.xne_irw.085/mdmamunu/IRW_HV_RUNS_WW15/irw_ddrss.static_eos.table.csv')

rows = []
section = ''

with report.open() as f:
    for raw in f:
        line = raw.rstrip('\n')
        if 'Cell Based Violation Summary Report' in line:
            section = 'cell_based'
            continue
        if 'Instance Based Violation Summary Report' in line:
            section = 'instance_based'
            continue

        if re.match(r'^\d+\s+', line):
            toks = line.split()
            if len(toks) < 6:
                continue
            idx, cell_count, cell_or_instance, device_name, dev_type, subtype = toks[:6]
            vd_match = re.search(r'Vd_max=([-0-9.]+)', line)
            vio_match = re.search(r'\(Vgd_min:[^)]*\)', line)
            rows.append([
                section,
                idx,
                cell_count,
                cell_or_instance,
                device_name,
                dev_type,
                subtype,
                vd_match.group(1) if vd_match else '',
                vio_match.group(0) if vio_match else ''
            ])
            continue

        if line.startswith('X'):
            toks = line.split()
            if len(toks) < 3:
                continue
            cell_or_instance, dev_type, subtype = toks[:3]
            vd_match = re.search(r'Vd_max=([-0-9.]+)', line)
            vio_match = re.search(r'\(Vgd_min:[^)]*\)', line)
            rows.append([
                section,
                '',
                '',
                cell_or_instance,
                '',
                dev_type,
                subtype,
                vd_match.group(1) if vd_match else '',
                vio_match.group(0) if vio_match else ''
            ])

header = [
    'section',
    'index',
    'cell_count',
    'cell_or_instance',
    'device_name',
    'type',
    'subtype',
    'vd_max',
    'violation'
]

with out_tsv.open('w', newline='') as f:
    writer = csv.writer(f, delimiter='\t')
    writer.writerow(header)
    writer.writerows(rows)

with out_csv.open('w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(rows)

with out_md.open('w') as f:
    f.write('| ' + ' | '.join(header) + ' |\n')
    f.write('|---|---:|---:|---|---|---|---|---:|---|\n')
    for row in rows:
        f.write('| ' + ' | '.join(row) + ' |\n')

print(f'WROTE {out_tsv}')
print(f'WROTE {out_md}')
print(f'WROTE {out_csv}')
print(f'ROWS {len(rows)}')
