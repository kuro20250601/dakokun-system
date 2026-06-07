# だこくん セットアップ手順書（お客様環境向け）

お客様ごとに独立した「だこくん」環境を構築するための手順です。
所要時間: 約30分

---

## 前提条件

- Node.js 18 以上がインストール済み
- Google アカウントを持っている（Firebase 用）
- GitHub アカウントを持っている（ソースコード取得用）

---

## 手順1: ソースコードの取得

```bash
git clone https://github.com/kuro20250601/dakokun-system.git
cd dakokun-system
npm install
```

---

## 手順2: Firebase プロジェクトの作成

### 2-1. プロジェクト作成

1. [Firebase コンソール](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `dakokun-顧客名`）
4. Google Analytics は任意（不要なら無効でOK）
5. 「プロジェクトを作成」をクリック

### 2-2. Authentication の有効化

1. 左メニューから「Authentication」を選択
2. 「始める」をクリック
3. 「ログイン方法」タブ →「メール / パスワード」を有効にして保存

### 2-3. Firestore Database の作成

1. 左メニューから「Firestore Database」を選択
2. 「データベースの作成」をクリック
3. ロケーションを選択（日本向けなら `asia-northeast1` 推奨）
4. 「テストモードで開始」を選択（後でルールを上書きするため）
5. 「作成」をクリック

### 2-4. Web アプリの登録

1. プロジェクト概要ページで「</>」（Web）アイコンをクリック
2. アプリのニックネームを入力（例: `だこくん`）
3. 「Firebase Hosting も設定する」はチェック不要
4. 「アプリを登録」をクリック
5. 表示される `firebaseConfig` の値を控えておく（次の手順で使用）

```
apiKey: "AIza..."
authDomain: "dakokun-xxx.firebaseapp.com"
projectId: "dakokun-xxx"
storageBucket: "dakokun-xxx.firebasestorage.app"
messagingSenderId: "123456789"
appId: "1:123456789:web:abc..."
measurementId: "G-XXXXXX"
```

---

## 手順3: 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、手順2-4 で取得した値を入力します。

```bash
# Firebase用（Firebaseコンソール > プロジェクトの設定 > マイアプリ から取得）
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=dakokun-xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dakokun-xxx
VITE_FIREBASE_STORAGE_BUCKET=dakokun-xxx.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc...
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXX
```

---

## 手順4: Firestore ルールのデプロイ

### 4-1. Firebase CLI のインストール

```bash
npm install -g firebase-tools
```

### 4-2. Firebase にログイン

```bash
firebase login
```

### 4-3. ルールをデプロイ

```bash
firebase deploy --only firestore:rules --project <プロジェクトID>
```

成功すると以下が表示されます:

```
✔  firestore: released rules firestore.rules to cloud.firestore
✔  Deploy complete!
```

---

## 手順5: 動作確認（ローカル）

```bash
npm run dev
```

ブラウザで `http://localhost:5173/` を開き、以下を確認します:

- [ ] サインアップページでユーザー登録ができる
- [ ] ログインができる
- [ ] 出勤・退勤打刻ができる
- [ ] ログアウトができる

---

## 手順6: Vercel へのデプロイ（本番公開）

### 6-1. Vercel CLI のインストール

```bash
npm install -g vercel
```

### 6-2. Vercel にログイン

```bash
vercel login
```

### 6-3. 環境変数の登録

```bash
# .env.local の各変数を Vercel に登録
grep -v '^#' .env.local | grep -v '^$' | while IFS='=' read -r key value; do
  printf '%s' "$value" | vercel env add "$key" production --yes
done
```

### 6-4. デプロイ

```bash
npm run build
vercel deploy --prod --yes
```

デプロイ完了後、表示される URL（`https://xxxx.vercel.app`）でアクセスできます。

---

## 手順7: 初期管理者の設定

1. 本番 URL にアクセスし、管理者となるユーザーでサインアップ
2. Firebase コンソール → Firestore Database → `users` コレクション
3. 該当ユーザーのドキュメントを開く
4. `role` フィールドの値を `employee` → `admin` に手動で変更
5. ページをリロードすると管理者メニューが表示される

> 以降は管理画面からユーザーのロール変更が可能です。

---

## トラブルシューティング

### ログイン時に「auth/invalid-api-key」エラーが出る

→ `.env.local`（ローカル）または Vercel の環境変数が正しく設定されているか確認してください。

### Vercel デプロイ後に画面が真っ白

→ ブラウザの開発者ツール（F12）→ Console タブでエラーを確認してください。
  多くの場合、環境変数の未設定が原因です。

### Firestore にデータが書き込めない

→ Firestore ルールがデプロイされているか確認してください:
```bash
firebase deploy --only firestore:rules --project <プロジェクトID>
```

### 2つのタブで同じユーザーになってしまう

→ 正常動作です。v1.x 以降では `browserSessionPersistence` を使用しており、
  タブごとに独立したセッションになっています。古いバージョンの場合はソースコードを更新してください。

---

## お客様環境の情報テンプレート

セットアップ完了後、以下を記録しておいてください。

| 項目 | 値 |
|---|---|
| 顧客名 | |
| Firebase プロジェクトID | |
| Firebase ログインアカウント | |
| Firebase コンソール URL | |
| Vercel プロジェクト名 | |
| 本番 URL | |
| 初期管理者メールアドレス | |
| セットアップ日 | |
