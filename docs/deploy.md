# 详细部署教程

本项目为**纯静态站点**（HTML / CSS / JS），无需 Node 构建、无需后端。任意支持静态文件的托管均可部署。

> **通用前提**
> 1. 必须通过 **HTTP(S)** 访问（ES Modules 不支持 `file://`）。
> 2. 建议仓库根目录就是站点根（含 `index.html`）。
> 3. 若放在子路径（如 `https://user.github.io/repo-name/`），一般无需改代码；相对路径已按当前目录解析。
> 4. 修改 CSS/JS 后请递增 `index.html` 中的 `?v=` 版本号，避免浏览器 / CDN 强缓存旧文件。

---

### 16.1 本地预览（部署前自测）

任选一种方式，在项目根目录执行：

```bash
# 方式 A：npx（需已安装 Node.js）
npx serve .

# 方式 B：Python 3
python3 -m http.server 8080

# 方式 C：Cloudflare Wrangler（与线上 CF 行为更接近）
npx wrangler pages dev .

# 方式 D：PHP（若已安装）
php -S 127.0.0.1:8080
```

浏览器打开终端提示的地址（如 `http://127.0.0.1:8080`），确认主页、设置、添加链接、主题与壁纸均正常后再上线。

---

### 16.2 GitHub Pages（免费、最常用）

适合个人仓库 + 自定义域名或 `*.github.io` 子路径。

#### 步骤 A：把代码推到 GitHub

```bash
# 若尚未初始化
git init
git add .
git commit -m "Initial commit: WodeNav"
git branch -M main

# 在 GitHub 新建空仓库后：
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

#### 步骤 B：开启 Pages（二选一）

**推荐：GitHub Actions（本仓库已提供工作流）**

1. 确认存在 `.github/workflows/pages.yml`。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 推送 `main` 或手动 **Actions → Deploy to GitHub Pages → Run workflow**。
4. 部署成功后，Settings → Pages 顶部会出现访问地址。

**备选：Deploy from a branch**

1. **Settings → Pages** → Source 选 **Deploy from a branch**。
2. Branch 选 **`main`**，文件夹选 **`/ (root)`** → **Save**。
3. 等待 1～2 分钟即可。

根目录已有 `.nojekyll`，避免 Jekyll 处理下划线目录（如 `_headers` 等）被忽略。

地址形态：

- 用户/组织站点：`https://<用户名>.github.io/`
- 项目站点：`https://<用户名>.github.io/<仓库名>/`

#### 步骤 C：自定义域名（可选）

1. 在域名 DNS 添加记录（以 Cloudflare / 阿里云为例）：
   - **A 记录** 指向 GitHub Pages IP（见 [官方文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)），或
   - **CNAME** 指向 `<用户名>.github.io`。
2. 仓库 **Settings → Pages → Custom domain** 填入域名并保存（会生成 `CNAME` 文件，请一并提交到仓库）。
3. 勾选 **Enforce HTTPS**（证书由 GitHub 自动申请，可能需等待几分钟）。

若域名在 Cloudflare：DNS 记录建议先 **DNS only（灰云）**，等 HTTPS 生效后再按需开代理；Proxied 时需注意 SSL 模式为 Full。

#### 步骤 D：更新默认导航数据（可选）

在任意设备编辑好链接后：

1. **设置 → 同步 → 部署同步 → 导出 data.js**
2. 用导出文件覆盖仓库中的 `js/data.js`
3. `git add js/data.js && git commit -m "Update default nav data" && git push`
4. 其他设备在设置里 **清除本地数据** 后刷新，即可加载新默认

#### GitHub Pages 缓存说明

GitHub Pages **不读取** `_headers`。缓存主要依赖：

- `index.html` 中 CSS/JS 的 `?v=日期版本` 查询参数（改代码后务必递增）
- 浏览器自身缓存策略

若需强刷：硬刷新（Ctrl/Cmd+Shift+R）或临时换一个更大的 `?v=`。

#### 常见问题

| 现象 | 处理 |
|------|------|
| 404 | 确认 Source 为 Actions 或 `main` + `/ (root)`，且仓库里有根目录 `index.html`；项目页注意子路径 |
| 白屏 / Console 报 Failed to load module | 是否用了 `file://`；或仓库为私有且 Pages 未对你开放 |
| CSS/JS 404 | 检查是否把站点部署在子目录，而资源写成了绝对路径 `/css/...`（本项目使用相对路径，一般无此问题） |
| Actions 失败 | 看 Actions 日志；确认 Pages Source 已切到 GitHub Actions，且 `permissions` 未被仓库策略覆盖 |

---

### 16.3 Cloudflare Pages（免费、全球 CDN、与 R2 搭配好）

#### 方式一：连接 Git 仓库（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 授权并选择你的 GitHub/GitLab 仓库。
3. 构建设置：
   - **Framework preset**：`None`
   - **Build command**：留空
   - **Build output directory**：`/` 或 `.`（根目录即产物）
4. **Save and Deploy**。完成后获得 `*.pages.dev` 域名。

后续每次 `git push` 到关联分支会自动重新部署。

#### 方式二：直接上传 / Wrangler CLI

**Dashboard 上传**

1. **Workers & Pages** → **Create** → **Pages** → **Upload assets**。
2. 将本项目**整包**（含 `index.html`、`css/`、`js/`、`wallpaper/`）打成 zip 或直接拖拽文件夹上传。

**命令行（适合 CI / 本地一键）**

```bash
# 首次登录
npx wrangler login

# 部署到已有项目（名称与 Dashboard 一致）
npx wrangler pages deploy . --project-name=wodenav
```

仓库内可选 `wrangler.toml` 仅作本地 `pages dev` 与项目名参考；Git 连接方式以 Dashboard 配置为准。

#### 自定义域名

1. 域名需已接入 Cloudflare（Nameserver 指向 CF）。
2. Pages 项目 → **Custom domains** → **Set up a custom domain** → 按提示添加。
3. HTTPS 自动开启。

#### `_headers` 说明（已优化）

根目录 `_headers` 在 **Cloudflare Pages 上自动生效**：

| 路径 | 策略 |
|------|------|
| `/`、`/index.html` | `max-age=0, must-revalidate` — HTML 始终校验更新 |
| `/css/*`、`/js/*` | `max-age=1y, immutable` — 配合 `?v=` 可永久缓存 |
| `/wallpaper/*`、`/icons/*` | `max-age=30d` — 资源变动较少 |

并附带基础安全头：`X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`、`Permissions-Policy`、`Cross-Origin-Opener-Policy`。

其他平台（GitHub Pages 等）会忽略此文件，可自行在 CDN/Nginx 配置等价头。

#### 与 Cloudflare R2 同步（可选）

若使用「设置 → 同步 → S3 / R2」：

1. 创建 R2 存储桶，生成 API Token（需对象读写权限）。
2. Endpoint 形如：`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
3. 在 R2 桶的 **Settings → CORS** 中允许你的站点域名，例如：

```json
[
  {
    "AllowedOrigins": ["https://你的域名.com", "https://xxx.pages.dev"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. 在导航页设置中填入 Endpoint、Access Key、Secret、Bucket、对象路径后即可上传/下载配置。

#### Cloudflare 优化建议

- **Always Use HTTPS**、**Automatic HTTPS Rewrites**：开启。
- **Brotli**：默认开启，保持即可。
- **Caching Level**：Standard；HTML 已由 `_headers` 强制 revalidate，无需再单独规则。
- **Rocket Loader**：建议关闭（可能干扰 ES Module 执行顺序）。
- **Email Address Obfuscation / Auto Minify**：对纯静态无妨开启；若遇异常可关闭 Auto Minify JS。
- **R2 公共读**：若壁纸放 R2，注意 CORS 与缓存头。

---

### 16.4 Vercel

1. 登录 [vercel.com](https://vercel.com) → **Add New → Project** → 导入 Git 仓库。
2. **Framework Preset** 选 **Other**。
3. **Build Command** 留空；**Output Directory** 留空（或 `.`）。
4. Deploy。默认域名：`https://<项目名>.vercel.app`。
5. **Settings → Domains** 可绑定自定义域名。

无需 `vercel.json` 即可工作。若希望强制 HTTPS、缓存等，可自行添加 `vercel.json`，例如：

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

---

### 16.5 Netlify

1. 登录 [netlify.com](https://www.netlify.com) → **Add new site → Import an existing project**。
2. 连接 Git 仓库。
3. **Build command** 留空；**Publish directory** 填 `.` 或留空（站点根）。
4. Deploy site。默认域名：`https://<随机名>.netlify.app`。
5. **Domain management** 绑定自定义域名；HTTPS 自动配置。

也可使用 **Netlify Drop**：把项目文件夹直接拖到 [app.netlify.com/drop](https://app.netlify.com/drop) 完成部署。

可选在根目录添加 `netlify.toml`：

```toml
[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
```

---

### 16.6 其他静态托管 / 对象存储静态网站

| 平台 | 要点 |
|------|------|
| **阿里云 OSS** | 开启「静态网站托管」，默认首页设为 `index.html`；绑定域名并配置 HTTPS 证书 |
| **腾讯云 COS** | 静态网站配置中指定索引文档 `index.html`；通过 CDN 加速与 HTTPS |
| **又拍云 / 七牛** | 上传整站后开启静态托管或绑定 CDN 域名 |
| **Nginx 自建** | 见下方配置示例 |
| **Apache** | `DocumentRoot` 指向项目根即可 |

#### Nginx 最小示例

```nginx
server {
    listen 80;
    server_name nav.example.com;
    root /var/www/wodenav;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源可适当长缓存（HTML 建议不长期缓存）
    location ~* \.(css|js|webp|png|jpg|svg|ico)$ {
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

有证书时在同 server 或单独 server 块配置 `listen 443 ssl`。

---

### 16.7 部署检查清单

上线前建议逐项确认：

- [ ] 用 HTTP(S) 打开首页，非白屏，Console 无红色报错
- [ ] 设置面板可打开，能添加一条测试链接
- [ ] 刷新后测试链接仍在（localStorage 写入正常）
- [ ] 主题切换、首页布局切换正常
- [ ] 壁纸（若使用本地图）能加载，Network 无 404
- [ ] 手机浏览器侧边栏、长按拖拽可用
- [ ] 若使用 WebDAV / GitHub / S3 同步：在目标环境测一次上传与下载
- [ ] （可选）导出 data.js 并推送到仓库，新无痕窗口清除本地后能看到默认数据
- [ ] 修改过 CSS/JS 后，`index.html` 里的 `?v=` 已递增
- [ ] Cloudflare：确认 `_headers` 在 Response Headers 中生效；GitHub：确认 `.nojekyll` 存在

---

### 16.8 私有部署与访问控制说明

本项目**不包含登录系统**。若需仅自己访问：

1. **托管平台侧**：GitHub Pages 私有仓库需付费计划；Cloudflare Access / Vercel Password Protection 等可加访问门禁。
2. **反向代理**：在 Nginx 上配置 `auth_basic` 或接入 SSO。
3. **同步凭证**：WebDAV 密码、GitHub Token、S3 Key 仅保存在用户浏览器，不会上传到本静态仓库；请勿把 Token 写进 `data.js` 或提交到 Git。

---

### 16.9 双平台对照（优化后）

| 项目 | GitHub Pages | Cloudflare Pages |
|------|----------------|------------------|
| 配置文件 | `.nojekyll`、`.github/workflows/pages.yml` | `_headers`、可选 `wrangler.toml` |
| 自定义响应头 | 不支持（靠 `?v=` 控缓存） | `_headers` 自动生效 |
| 全球 CDN | 有限节点 | 全网 CF 边缘 |
| 与 R2 同步 | 可用，但跨云 | 同生态，延迟与流量更友好 |
| 推荐场景 | 简单个人站、与 GitHub 一体 | 要性能、自定义域名已在 CF、或用 R2 |

两者可同时部署：同一仓库连 Cloudflare Pages，再开 GitHub Pages 作为备用入口。
