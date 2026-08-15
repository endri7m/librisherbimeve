# Konfigurimi i autentikimit

Ky version përdor Supabase Auth për Email/Password dhe Google Login. Apple Login është lënë i çaktivizuar për momentin, sipas kërkesës.

## 1. Ekzekuto politikat RLS

Hap Supabase Dashboard, zgjidh projektin dhe shko te **SQL Editor**. Kopjo dhe ekzekuto përmbajtjen e `supabase-auth-rls.sql`. Kjo shton `user_id` te `vehicles` dhe `services`, aktivizon Row Level Security dhe lejon vetëm përdoruesin pronar të lexojë, shtojë, modifikojë ose fshijë të dhëna.

Nëse databaza përmban të dhëna të vjetra, ato kanë `user_id = NULL` dhe nuk do të shfaqen pasi aktivizohet RLS. Cakto pronarin e tyre me UUID-në e përdoruesit përkatës vetëm nëse dëshiron t’i migrosh.

## 2. Email/Password

Te **Authentication > Providers**, sigurohu që Email provider është aktiv. Nëse është aktivizuar konfirmimi i email-it, përdoruesi duhet të klikojë lidhjen e konfirmimit para hyrjes së parë.

## 3. Google Login

Te **Authentication > Providers > Google**, aktivizo Google dhe vendos Client ID/Client Secret nga Google Cloud Console. Te Google Cloud duhet të shtosh redirect URI-në që Supabase shfaq në faqen e provider-it, zakonisht:

```text
https://bdzchtsgoxlasucauoww.supabase.co/auth/v1/callback
```

Te **Authentication > URL Configuration**, vendos URL-në e website-it te Site URL dhe shto URL-në e preview/deployment-it te Redirect URLs. Për rrjedhën e Forgot Password duhet të shtosh edhe route-in e resetimit, për shembull:

```text
https://domaini-yt.com/reset-password
```

Në preview mund të shtosh edhe URL-në përkatëse të preview-it me `/reset-password`. Aplikacioni përdor automatikisht `window.location.origin + '/reset-password'` për linkun e rikuperimit.

## 4. Verifikimi i email-it për Forgot Password

Për të mos shfaqur sukses për email-e që nuk ekzistojnë, ekzekuto skedarin `supabase-password-reset-email-check.sql` në **Supabase > SQL Editor**. Ky migration krijon funksionin `email_exists_for_password_reset`, i cili kthen vetëm `true` ose `false` dhe nuk ekspozon të dhëna të përdoruesve. Aplikacioni nuk dërgon `resetPasswordForEmail` dhe nuk aktivizon cooldown-in nëse email-i nuk gjendet.

Ky kontroll ekspozon në mënyrë të qëllimshme vetëm nëse email-i ekziston, sepse kërkesa e këtij aplikacioni është që përdoruesi të marrë njoftim të ndryshëm kur email-i nuk është i regjistruar. Nëse migration-i nuk ekzekutohet, aplikacioni ndalon dërgimin dhe shfaq njoftim që verifikimi nuk është konfiguruar, në vend që të shfaqë sukses të rremë.

## 5. Konfigurimi publik

`env-config.js` përmban Project URL dhe publishable/anon key. Këto janë çelësa publikë për frontend. Mos vendos kurrë `service_role key` ose fjalëkalimin e databazës në këtë skedar.

## 6. Testimi

Pa sesion, aplikacioni shfaq Login Page dhe fsheh Dashboard-in. Pas hyrjes, shfaqet sidebar-i dhe kërkesat e databazës dërgohen me `user_id`. Pas Logout, sesioni hiqet dhe përdoruesi kthehet te Login Page.

## Udhëzime të shpejta për Google Login

1. Në Google Cloud Console hap **APIs & Services > Credentials** dhe krijo një **OAuth 2.0 Client ID** me tipin **Web application**.
2. Te **Authorized redirect URIs** shto adresën që jep Supabase, zakonisht `https://bdzchtsgoxlasucauoww.supabase.co/auth/v1/callback`.
3. Kopjo **Client ID** dhe **Client Secret** nga Google Cloud Console.
4. Në Supabase hap **Authentication > Providers > Google**, aktivizo provider-in dhe ngjit vlerat te fushat **Client ID** dhe **Client Secret**.
5. Te **Authentication > URL Configuration** shto URL-në e website-it te **Site URL** dhe shto preview/deployment URL te **Redirect URLs**.
6. Ruaj ndryshimet dhe testo butonin Google në Login Page. Nëse provider-i është aktiv, butoni do të të ridrejtojë te Google dhe më pas do të kthejë përdoruesin në aplikacion.

## Rregullimi i gabimit `owner_name`

Nëse shfaqet gabimi `Could not find the 'owner_name' column of 'vehicles' in the schema cache`, ekzekuto skedarin `supabase-vehicle-schema-fix.sql` në **Supabase > SQL Editor**. Ky migration shton kolonat e automjeteve dhe shërbimeve që përdor aplikacioni, krijon indekset dhe dërgon komandën për rifreskimin e PostgREST schema cache. Pas ekzekutimit, rifresko browser-in me `Ctrl + F5`.
