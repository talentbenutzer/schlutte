-- Firmenanschriften aus den vorhandenen Auslagenerstattungsformularen.
-- Empfänger-E-Mail-Adressen werden später gepflegt.

update public.expense_companies
set name = 'Grabner Design GmbH',
    address = concat('Tüchlinger Weg 1', chr(10), 'D-79400 Kandern')
where id = 'grabner'
  and address is null;

update public.expense_companies
set name = 'studio höllental.',
    address = concat('Tüchlingerweg 1', chr(10), 'D-79400 Kandern')
where id = 'hoellental'
  and address is null;
