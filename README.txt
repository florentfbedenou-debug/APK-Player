APK PLAYER — INSTALLATION (WINDOWS 10)

1. Extrais ce dossier dans ton Bureau, sous le nom APK-Player.
2. Ouvre le dossier APK-Player dans l'Explorateur de fichiers.
3. Clique dans la barre d'adresse, écris cmd puis appuie sur Entrée.
4. Exécute :
   npm install
5. Quand l'installation est terminée, exécute :
   npm start
6. Ouvre dans Chrome :
   http://127.0.0.1:3000

Le site local est maintenant prêt pour importer et lister les fichiers APK.

INSTALLER UN APK :
Le bouton Installer a besoin d'ADB (Android Platform Tools) accessible dans le PATH
et d'un appareil ou moteur Android démarré et autorisé par ADB.
La page web ne contient pas elle-même un moteur Android.
Pour vérifier la connexion, lance `adb devices` dans CMD.
Si Android n'est pas connecté, le site continuera à fonctionner pour importer et lister les APK.

SECURITE :
Le serveur écoute seulement sur 127.0.0.1, donc il est destiné à cet ordinateur.
N'importe pas d'APK provenant d'une source non fiable.
