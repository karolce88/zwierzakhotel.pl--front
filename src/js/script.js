document.addEventListener('DOMContentLoaded', () => {
	const logoImg = document.querySelector('.JSlogo a img')
	const footerYear = document.querySelector('.JSyear')

	const handleCurrentYear = () => {
		if (footerYear) {
			const year = new Date().getFullYear()
			footerYear.innerText = year
		}
	}
	handleCurrentYear()

	const burgerBtn = document.querySelector('.JS-burger')
	const mobileMenu = document.querySelector('.JSmobile-nav')
	const mobileMenuLinks = document.querySelectorAll('.menu-item a')
	const logo = document.querySelector('.JSlogo')
	const body = document.body

	const handleMobileMenu = () => {
		const showNav = () => {
			mobileMenu.classList.add('show-mobile-menu')
			burgerBtn.classList.add('active')
		}

		const hideNav = () => {
			mobileMenu.classList.remove('show-mobile-menu')
			burgerBtn.classList.remove('active')
		}

		const overflowBody = () => {
			body.classList.toggle('overflow-hidden-body')
		}

		burgerBtn.addEventListener('click', () => {
			if (mobileMenu.classList.contains('show-mobile-menu')) {
				hideNav()
				overflowBody()
				logoImg.classList.remove('change-height-logo')
			} else {
				showNav()
				overflowBody()
				logoImg.classList.add('change-height-logo')
			}
		})

		// close mobile menu after click on menu items
		mobileMenuLinks.forEach((link) => {
			link.addEventListener('click', () => {
				if (mobileMenu.classList.contains('show-mobile-menu')) {
					hideNav()
					overflowBody()
					logoImg.classList.remove('change-height-logo')
				}
			})
		})

		// close mobile menu after click on logo
		logo.addEventListener('click', () => {
			if (mobileMenu.classList.contains('show-mobile-menu')) {
				hideNav()
				overflowBody()
			}
		})
	}

	handleMobileMenu()

	const changeLogoHeightDuringScrol = () => {
		if (!logo) return
		const TRIGGER = 150
		let ticking = false
		function onScroll() {
			const scrollY = window.scrollY
			if (!ticking) {
				window.requestAnimationFrame(() => {
					if (scrollY > TRIGGER) {
						logoImg.classList.add('change-height-logo')
					} else {
						logoImg.classList.remove('change-height-logo')
					}
					ticking = false
				})
				ticking = true
			}
		}
		window.addEventListener('scroll', onScroll)
	}
	changeLogoHeightDuringScrol()

	const handleNavDuringScroll = () => {
		const nav = document.querySelector('.navigation-container')
		if (!nav) return
		let lastScrollY = window.scrollY
		let ticking = false
		const HIDE_OFFSET = 10
		const START_SCROLL = 800
		function onScroll() {
			const currentScrollY = window.scrollY
			if (!ticking) {
				window.requestAnimationFrame(() => {
					if (currentScrollY < START_SCROLL) {
						nav.classList.remove('nav-hidden')
						lastScrollY = currentScrollY
						ticking = false
						return
					}
					const isScrollingDown = currentScrollY > lastScrollY + HIDE_OFFSET
					const isScrollingUp = currentScrollY < lastScrollY - HIDE_OFFSET
					if (isScrollingDown) {
						nav.classList.add('nav-hidden')
					} else if (isScrollingUp) {
						nav.classList.remove('nav-hidden')
					}
					lastScrollY = currentScrollY
					ticking = false
				})
				ticking = true
			}
		}
		window.addEventListener('scroll', onScroll, { passive: true })
	}
	handleNavDuringScroll()

	// END
})
