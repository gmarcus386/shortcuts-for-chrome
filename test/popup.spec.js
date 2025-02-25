import {Popup, RecentLinks, Storage} from '../src';

describe('Popup Window', function () {

    before(function () {
        global.popup = null;
        global.getLink = (n) =>
            (document.getElementsByTagName('a')[n || 0]);
        global.getLinkText = (link) =>
            (link.getElementsByTagName('span')[0]);
        global.getLinkName = (link) =>
            (link.getAttribute('data-name'));
        global.getLinkPin = (link) =>
            (link.getElementsByTagName('svg')[0]);
        global.SimulateDragEvent = function (el, type) {
            const createTransferEvent = (type) => {
                const ev = new window.CustomEvent(type, {});
                ev.dataTransfer = {
                    effectAllowed: () => false,
                    setData: () => false,
                    getData: () => (el.outerHTML)
                };
                return ev;
            };
            el.dispatchEvent(createTransferEvent(type));
        };
    });

    beforeEach(() => {
        chrome.storage.sync.get.yields({
            pinned: ['about', 'history', 'crashes'],
            recent: [
                {url: 'apps', ts: Date.now() + 500},
                {url: 'about', ts: Date.now() - 500}
            ]
        });
        sandbox.spy(Storage, 'save');
        global.popup = new Popup();
    });

    afterEach(function () {
        chrome.flush();
        sandbox.restore();
    });

    after(function () {
        delete global.popup;
        delete global.getLink;
        delete global.getLinkName;
        delete global.getLinkPin;
        delete global.getLinkText;
        delete global.SimulateDragEvent;
    });

    it('Menu panel initializes when empty storage', () => {
        chrome.storage.sync.get.yields({});
        expect(() => {
            new Popup();
        }, 'empty storage').to.not.throw();
        expect(Popup.getLinks().pinned, 'no pinned items').to.have.length(0);
    });

    it('Menu panel initializes when empty pinned list', () => {
        chrome.storage.sync.get.yields({pinned: []});
        expect(() => {
            new Popup();
        }, 'no pinned items').to.not.throw();
        expect(Popup.getLinks().pinned, 'no pinned items').to.have.length(0);
    });

    it('Menu panel initializes with pinned items', () => {
        expect(() => {
            new Popup();
        }, 'some pinned items').to.not.throw();
        expect(Popup.getLinks().pinned, '3 pinned items').to.have.length(3);
    });

    it('Pin click toggles link on and off', () => {
        chrome.storage.sync.set.yields(null);
        let link = getLink(0),
            name = getLinkName(link),
            pin = getLinkPin(link);

        expect(Popup.getLinks().pinned, 'pinned').to.contain(name);
        pin.onclick();
        expect(Popup.getLinks().pinned, 'not pinned after 1 click').to.not.contain(name);
        pin.onclick();
        expect(Popup.getLinks().pinned, 'pinned after 2nd click').to.contain(name);
    });

    it('Clicking link text opens a tab', () => {
        chrome.storage.sync.set.yields(null);
        const link = getLink(0), label = getLinkText(link);
        const fullURL = 'chrome://' + getLinkName(link);
        expect(chrome.tabs.create.withArgs({url: fullURL}).notCalled, 'before click').to.be.true;
        label.onclick();
        expect(chrome.tabs.create.withArgs({url: fullURL}).calledOnce, 'after click').to.be.true;
    });

    it('Clicking link  adds opened links to recent links', () => {
        let link = getLink(0), label = getLinkText(link), url = getLinkName(link);
        const stub = sandbox.stub(RecentLinks, 'addRecent');
        label.onclick();
        expect(stub.withArgs(url).calledOnce).to.be.true;
    });

    describe('Link dragging', () => {

        it('Hover over elements and drop outside area', (done) => {
            let firstLink = getLink(0),
                secondLink = getLink(1),
                thirdLink = getLink(2);

            expect(Storage.save.notCalled, 'before drag').to.be.true;
            expect(() => {
                SimulateDragEvent(secondLink, 'dragstart');
                SimulateDragEvent(secondLink, 'dragover');  // move over self
                SimulateDragEvent(secondLink, 'dragleave');
                SimulateDragEvent(firstLink, 'dragover');  // move to before self
                SimulateDragEvent(firstLink, 'dragleave');
                SimulateDragEvent(thirdLink, 'dragover');  // move to after self
                SimulateDragEvent(thirdLink, 'dragleave');
                SimulateDragEvent(secondLink, 'dragend'); // drop outside
            }).to.not.throw();
            setTimeout(() => {
                expect(Storage.save.notCalled, 'no drop event occured').to.be.true;
                done();
            }, 10);
        });

        it('Drag/drop on self', (done) => {
            let firstLink = getLink(0);

            expect(Storage.save.notCalled, 'before drag').to.be.true;
            expect(() => {
                SimulateDragEvent(firstLink, 'dragstart');
                SimulateDragEvent(firstLink, 'drop');
            }).to.not.throw();
            setTimeout(() => {
                expect(Storage.save.calledOnce, 'drop callback fired').to.be.true;
                done();
            }, 10);
        });

        it('Drag/drop with order change > move before to after', (done) => {
            let firstLink = getLink(0),
                secondLink = getLink(1);

            expect(Storage.save.notCalled, 'before drag').to.be.true;
            expect(() => {
                SimulateDragEvent(firstLink, 'dragstart');
                SimulateDragEvent(secondLink, 'drop');
            }).to.not.throw();
            setTimeout(() => {
                expect(Storage.save.calledOnce, 'drop callback fired').to.be.true;
                done();
            }, 10);
        });

        it('Drag/drop with order change > move after to before', (done) => {
            let firstLink = getLink(0),
                secondLink = getLink(1);

            expect(Storage.save.notCalled, 'before drag').to.be.true;
            expect(() => {
                SimulateDragEvent(secondLink, 'dragstart');
                SimulateDragEvent(firstLink, 'drop');
            }).to.not.throw();
            setTimeout(() => {
                expect(Storage.save.calledOnce, 'drop callback fired').to.be.true;
                done();
            }, 10);
        });
    });
});
