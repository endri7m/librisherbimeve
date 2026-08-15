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

Te **Authentication > URL Configuration**, vendos URL-në e website-it te Site URL dhe shto edhe URL-në e preview/deployment-it te Redirect URLs. Aplikacioni përdor automatikisht `window.location.origin` si redirect pas hyrjes.

## 4. Konfigurimi publik

`env-config.js` përmban Project URL dhe publishable/anon key. Këto janë çelësa publikë për frontend. Mos vendos kurrë `service_role key` ose fjalëkalimin e databazës në këtë skedar.

## 5. Testimi

Pa sesion, aplikacioni shfaq Login Page dhe fsheh Dashboard-in. Pas hyrjes, shfaqet sidebar-i dhe kërkesat e databazës dërgohen me `user_id`. Pas Logout, sesioni hiqet dhe përdoruesi kthehet te Login Page.

## Udhëzime të shpejta për Google Login

1. Në Google Cloud Console hap **APIs & Services > Credentials** dhe krijo një **OAuth 2.0 Client ID** me tipin **Web application**.
2. Te **Authorized redirect URIs** shto adresën që jep Supabase, zakonisht `https://bdzchtsgoxlasucauoww.supabase.co/auth/v1/callback`.
3. Kopjo **Client ID** dhe **Client Secret** nga Google Cloud Console.
4. Në Supabase hap **Authentication > Providers > Google**, aktivizo provider-in dhe ngjit vlerat te fushat **Client ID** dhe **Client Secret**.
5. Te **Authentication > URL Configuration** shto URL-në e website-it te **Site URL** dhe shto preview/deployment URL te **Redirect URLs**.
6. Ruaj ndryshimet dhe testo butonin Google në Login Page. Nëse provider-i është aktiv, butoni do të të ridrejtojë te Google dhe më pas do të kthejë përdoruesin në aplikacion.
